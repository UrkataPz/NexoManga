// ancho y alto de una página, en píxeles
export type PageSize = [number, number];

// reglas de la lectura válida (ajustables)
export const COVERAGE_MIN = 0.8; //cuanto del capitlo debe de leerse
export const SECONDS_PER_NORMALIZED_PAGE = 3; //cuantos segundos por cada pagina normalizada
export const MIN_READ_SECONDS = 8; //segundos minimos de lectura
export const MAX_READ_SECONDS = 90; //segundos maximos de lectura
export const MAX_VALID_READINGS_PER_HOUR = 60; //maximo de lecturas validas por hora
export const STANDARD_PAGE_RATIO = 1.5; //porporcion de la pagina

// reglas del lector en el navegador
export const IDLE_AFTER_SECONDS = 30;
export const HEARTBEAT_SECONDS = 15;

// peso de cada página: su alto/ancho comparado con una página de manga (2:3); sin tamaño vale 1
//aqui se evalua el largo de las paginas, en caso para los webtoons o capitulos con un panel mas largo de lo habitual
// divide el alto entre lo ancho y da un valor, si es 1 equivale a una pagina normal. y si es superior es porque es una tira larga
// de capitulo que quivaldria X veces mas que una pagina normal dependiendo del resultado.
export function getPageWeights(pageSizes: PageSize[] | null, pageCount: number): number[] {
  const weights: number[] = [];
  for (let index = 0; index < pageCount; index++) {
    const size = pageSizes?.[index];
    const isValid = Array.isArray(size) && size[0] > 0 && size[1] > 0;
    weights.push(isValid ? size[1] / size[0] / STANDARD_PAGE_RATIO : 1);
  }
  return weights;
}

// largo "justo" del capítulo: la suma de los pesos de sus páginas
export function getNormalizedPages(weights: number[]): number {
  return weights.reduce((total, weight) => total + weight, 0);
}

// tiempo mínimo para que una lectura cuente, con piso y techo
//Math.max(8, seconds): max = "el mayor de los dos". Si seconds es menor que 8, gana 8. Ese es el piso.
//Math.min(90, seconds): min = "el menor de los dos". Si lo anterior pasa de 90, gana 90. Ese es el techo.
export function getRequiredSeconds(normalizedPages: number): number {
  const seconds = normalizedPages * SECONDS_PER_NORMALIZED_PAGE;
  return Math.min(MAX_READ_SECONDS, Math.max(MIN_READ_SECONDS, seconds));
}

// cobertura: cuánto del capítulo se vio, pesando cada página por su tamaño (0 a 1)
export function getCoverage(weights: number[], seenByPage: Map<number, number>): number { //el map son dos columnas una indica la pagina, la otra el porcentaje que se vio de esa pagina (0 a 1)
  const total = getNormalizedPages(weights);
  if (total === 0) return 0;

  let seen = 0;
  weights.forEach((weight, index) => {
    seen += weight * (seenByPage.get(index + 1) ?? 0);
  });
  return seen / total;
}

// ¿la lectura es válida? cobertura suficiente y tiempo activo suficiente
export function isValidReading(coverage: number, activeSeconds: number, requiredSeconds: number): boolean {
  return coverage >= COVERAGE_MIN && activeSeconds >= requiredSeconds;
}

// valor de la lectura para el pago: cobertura × páginas normalizadas
export function getReadingValue(coverage: number, normalizedPages: number): number {
  return Math.round(coverage * normalizedPages * 1000) / 1000;
}
