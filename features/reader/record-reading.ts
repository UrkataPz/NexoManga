import { getChapterForReader, isTranslationOfChapter } from "@/lib/reader_queries"; // consultas del lector con la sesión del usuario (lib/reader_queries.ts)
import { // consultas que guardan y leen métricas con la llave maestra (lib/reading_queries.ts):
  countValidReadingsSince, // cuenta las lecturas válidas del usuario desde una hora
  getReadingSession, // busca la sesión: de quién es, qué capítulo y cuándo se abrió
  getSessionStats, // suma el tiempo activo ya guardado y el máximo "visto" por página
  insertPageViews, // guarda el tiempo de cada página de un latido
  isAlreadyValid, // ¿ya tenía lectura válida de este capítulo?
  openReadingSession, // guarda "abrió" con la hora de la BD y devuelve el id de sesión
  saveValidReading, // guarda "terminó" y la boleta con el valor para el pago
  type PageReport, // molde de un reporte de página (página, tiempos y visto)
} from "@/lib/reading_queries";
import { getChapterAccess } from "@/features/reader/chapter-access"; // el portero: decide si puede leer y por qué
import { // fórmulas del lector (features/reader/reader-rules.ts):
  getCoverage, // cuánto del capítulo se vio, con pesos (0 a 1)
  getNormalizedPages, // largo "justo" del capítulo: la suma de los pesos
  getPageWeights, // peso de cada página según su alto/ancho
  getReadingValue, // valor para el pago: cobertura × páginas normalizadas
  getRequiredSeconds, // tiempo mínimo: páginas × 3 s, entre 8 y 90
  isValidReading, // ¿cobertura ≥ 80 % y tiempo ≥ mínimo?
  MAX_VALID_READINGS_PER_HOUR, // freno: máximo 60 lecturas válidas por hora
} from "@/features/reader/reader-rules";

// margen por diferencias pequeñas entre el reloj del navegador y el del servidor
const CLOCK_TOLERANCE_MS = 3000; // 3 s de margen: el navegador empieza a contar antes de que el "abrí" llegue al servidor

// abre una sesión solo si el usuario puede leer el capítulo y no es su propia obra
export async function startReading( // la llama la ventanilla (app/api/reading/route.ts) cuando llega un "abrí"
  userId: string, // quién (sale de la cookie, no de lo que diga el navegador)
  chapterId: string, // qué capítulo dice el navegador
  translationId: string | null, // qué traducción dice el navegador (todavía sin creerle)
): Promise<string | null> { // devuelve el id de la sesión, o null si no se abre
  const chapter = await getChapterForReader(chapterId); // llama a getChapterForReader (lib/reader_queries.ts): datos del capítulo sin páginas; la RLS esconde lo que no debe ver
  if (!chapter) return null; // no existe o no lo puede ver: sin sesión

  const access = await getChapterAccess({ //damos acceso para leer el capitulo — llama a getChapterAccess (features/reader/chapter-access.ts): vuelve a revisar si puede leerlo, porque /api/reading es otra puerta
    userId,
    chapterId,
    workId: chapter.workId,
    isVln: chapter.isVln,
    isPremium: chapter.isPremium,
  });
  if (!access.allowed || access.reason === "own_work") return null; // no puede leer, o es lo propio (autor o quien lo tradujo): sin sesión y sin valor

  // la traducción que manda el navegador solo se acepta si de verdad es de este capítulo
  const validTranslationId = // si (vino un id Y es de este capítulo) → se acepta; si no → null (cuenta como el original)
    translationId && (await isTranslationOfChapter(translationId, chapterId)) ? translationId : null; // llama a isTranslationOfChapter (lib/reader_queries.ts): ¿esa traducción es de este capítulo y la puede ver?

  return openReadingSession(userId, chapterId, validTranslationId); // llama a openReadingSession (lib/reading_queries.ts): guarda "abrió" y devuelve el id de sesión
}

// limpia lo que mandó el navegador: páginas válidas, números razonables y sin repetidos
function cleanReports(reports: unknown[], pageCount: number): PageReport[] { //recibe la respuesta del navegador
  const byPage = new Map<number, PageReport>(); // libreta limpia: una fila por página (así no se repite)

  for (const raw of reports.slice(0, pageCount)) { // recorre cada reporte, pero como máximo tantos como páginas tiene el capítulo
    const report = raw as Partial<PageReport>; // "trátalo como un reporte al que le pueden faltar datos" (todavía no revisa nada)
    const page = Number(report.page); // el número de página convertido a número ("3" → 3, basura → NaN)
    if (!Number.isInteger(page) || page < 1 || page > pageCount || byPage.has(page)) continue; // se salta si no es entero, si la página no existe o si vino repetida

    const toMs = (value: unknown) => Math.max(0, Math.round(Number(value) || 0)); // maquinita: convierte cualquier cosa en ms enteros y nunca negativos (basura → 0)
    byPage.set(page, { // guarda el reporte ya limpio
      page,
      activeMs: toMs(report.activeMs), // tiempo activo limpio
      idleMs: toMs(report.idleMs), // tiempo inactivo limpio
      hiddenMs: toMs(report.hiddenMs), // tiempo oculto limpio
      seen: Math.min(1, Math.max(0, Number(report.seen) || 0)), // "visto" encerrado entre 0 y 1
    });
  }

  return Array.from(byPage.values()); // devuelve la libreta como lista
}

// guarda un latido y revisa si la lectura ya es válida; devuelve true solo la vez que se valida
export async function recordHeartbeat(userId: string, sessionId: string, reports: unknown[]): Promise<boolean> { // la llama la ventanilla (app/api/reading/route.ts) con cada latido
  const session = await getReadingSession(sessionId); // llama a getReadingSession (lib/reading_queries.ts): de quién es la sesión, qué capítulo y cuándo se abrió
  if (!session || session.userId !== userId) return false; // no existe o es de otra persona: se rechaza

  const chapter = await getChapterForReader(session.chapterId); // llama a getChapterForReader (lib/reader_queries.ts): cuántas páginas y sus tamaños
  if (!chapter) return false; // el capítulo ya no se puede ver: se rechaza

  const cleaned = cleanReports(reports, chapter.pageCount); // limpia lo que mandó el navegador (la función de arriba)
  const before = await getSessionStats(sessionId); // llama a getSessionStats (lib/reading_queries.ts): lo ya guardado de esta sesión (tiempo activo y "visto")
  const newActiveMs = cleaned.reduce((total, report) => total + report.activeMs, 0); // suma el tiempo activo de este latido
  const elapsedMs = Date.now() - new Date(session.openedAt).getTime(); // tiempo real desde que abrió, con el reloj del servidor

  // el tiempo activo reportado nunca puede superar el tiempo real según el servidor
  if (before.activeMs + newActiveMs > elapsedMs + CLOCK_TOLERANCE_MS) return false; // reporta más tiempo del real (+3 s): se descarta el latido entero

  await insertPageViews(session, sessionId, cleaned); // llama a insertPageViews (lib/reading_queries.ts): guarda el tiempo de cada página (aunque ya esté validada: sirve para estadísticas)

  if (await isAlreadyValid(userId, session.chapterId)) return false; // llama a isAlreadyValid (lib/reading_queries.ts): si ya tenía lectura válida, no se vuelve a pagar

  const seenByPage = new Map(before.seenByPage); // copia del "visto" ya guardado
  for (const report of cleaned) { // le suma lo de este latido…
    seenByPage.set(report.page, Math.max(seenByPage.get(report.page) ?? 0, report.seen)); // …quedándose con el máximo de cada página
  }

  const weights = getPageWeights(chapter.pageSizes, chapter.pageCount); // llama a getPageWeights (reader-rules.ts): peso de cada página, ej. [1,1,1,1]
  const normalizedPages = getNormalizedPages(weights); // llama a getNormalizedPages (reader-rules.ts): suma de los pesos, ej. 4
  const coverage = getCoverage(weights, seenByPage); // llama a getCoverage (reader-rules.ts): cuánto se vio, de 0 a 1
  const activeSeconds = (before.activeMs + newActiveMs) / 1000; // tiempo activo total, en segundos

  if (!isValidReading(coverage, activeSeconds, getRequiredSeconds(normalizedPages))) return false; // llama a isValidReading y getRequiredSeconds (reader-rules.ts): si no llega al 80 % y al mínimo, todavía no es válida

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // la hora de hace 1 hora, en texto para la BD
  if ((await countValidReadingsSince(userId, oneHourAgo)) >= MAX_VALID_READINGS_PER_HOUR) return false; // llama a countValidReadingsSince (lib/reading_queries.ts): si ya hizo 60 válidas en la última hora, esta no cuenta

  await saveValidReading(session, sessionId, coverage, getReadingValue(coverage, normalizedPages)); // llama a saveValidReading (lib/reading_queries.ts) con el valor de getReadingValue (reader-rules.ts): guarda "terminó" y la boleta
  return true; // ¡válida! la ventanilla contesta { valid: true } y sale el aviso verde
}
