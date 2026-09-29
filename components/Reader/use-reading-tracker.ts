"use client"; // corre en el navegador: mide el scroll y el tiempo del lector

import { useEffect, type RefObject } from "react"; // useEffect = correr algo cuando el lector ya está en pantalla
import { toast } from "sonner"; // el aviso verde de "Lectura registrada"
import { HEARTBEAT_SECONDS, IDLE_AFTER_SECONDS } from "@/features/reader/reader-rules"; // 15 s entre latidos y 30 s para inactivo

interface PageTime { // lo que se anota de cada página (los tiempos en milisegundos: 1 s = 1000 ms)
  activeMs: number; // tiempo leyendo de verdad (pestaña visible y tocando algo)
  idleMs: number; // tiempo con la pestaña visible pero sin tocar nada por 30 s
  hiddenMs: number; // tiempo con la pestaña oculta o minimizada
  seen: number; // cuánto se vio de la página, de 0 (nada) a 1 (toda)
}

const ACTIVITY_EVENTS = ["scroll", "wheel", "keydown", "pointerdown", "pointermove", "touchstart"]; // lo que cuenta como "hacer algo": scroll, rueda, tecla, clic, mover el mouse, tocar la pantalla

// manda datos al servidor (keepalive = que llegue aunque se esté cerrando la pestaña)
function postReading(body: object, keepalive: boolean) {
  return fetch("/api/reading", { //se comunica con reading en /api/reading devolviendo una promesa
    method: "POST", // POST = le envío datos
    headers: { "Content-Type": "application/json" }, // aviso: lo que va es JSON
    body: JSON.stringify(body),  //convierte el objeto a texto para poder viajas
    keepalive, //indica que el navegador termina de enviar el mensaje aunque la pestaña se cierre.
  }).then((response) => response.json()); //al llegar la promesa convierte la respuesta en objeto (response)
}

// mide la lectura en el navegador (tiempo y cuánto se vio de cada página) y la manda cada 15 s (el heartbeat)
export function useReadingTracker(
  pagesRef: RefObject<HTMLElement | null>, // la manija del div que tiene todas las páginas
  chapterId: string, // el capítulo que se lee
  translationId: string | null, // la traducción que se lee (null = original)
  enabled: boolean, // false = autor o traductor leyendo lo suyo: no se mide
) {
  useEffect(() => { // corre cuando el lector ya está en pantalla
    if (!enabled) return; // lo propio no se mide: ni siquiera se avisa "abrí"

    let sessionId: string | null = null; // id de la sesión que da el servidor; sin él no se manda nada
    let alreadyValid = false; // para mostrar el aviso de "leído" una sola vez
    let lastTick = Date.now(); // hora de la última vuelta (para saber cuánto pasó de verdad)
    let lastActivity = Date.now(); // hora de la última vez que el usuario hizo algo
    let msSinceSend = 0; //ms desde el ultimo envío de metricas
    const pending = new Map<number, PageTime>(); //libreta de lo pendiente por enviar
    const seenMax = new Map<number, number>(); //lo maximo que se vio durante toda la lectura

    // recuerda la última vez que el usuario hizo algo
    const markActivity = () => {
      lastActivity = Date.now(); // anota "ahora" como última actividad
    };

    // manda al servidor lo nuevo desde el último envío y lo vacía
    const send = (keepalive: boolean) => { // keepalive = true solo cuando se oculta o se cierra la pestaña
      if (!sessionId || pending.size === 0) return; //si el servidor no ha contestado, no manda nada

      const pages = Array.from(pending, ([page, time]) => ({ //convertimos pending en lista para enviarla como JSON
        page, // número de página
        activeMs: Math.round(time.activeMs), // redondea los ms (el reparto deja decimales)
        idleMs: Math.round(time.idleMs),
        hiddenMs: Math.round(time.hiddenMs),
        seen: time.seen, // cuánto se vio (0 a 1)
      }));
      pending.clear(); // vacía la libreta: el próximo latido solo lleva lo nuevo

      postReading({ action: "heartbeat", sessionId, pages }, keepalive) // manda el latido
        .then((result) => { // cuando el servidor contesta
          if (result.valid && !alreadyValid) { // dijo "esta vez se validó" y todavía no se avisaba
            alreadyValid = true; // ya se avisó
            toast.success("Lectura registrada: capítulo marcado como leído."); // el aviso verde
          }
        })
        .catch(() => {}); // si falla (sin internet), no rompe el lector; ese latido se pierde
    };

    // cada segundo: reparte el tiempo entre las páginas visibles y actualiza cuánto se vio
    const tick = () => {
      const now = Date.now(); // la hora de esta vuelta
      const elapsed = now - lastTick; //tiempo transcurrido
      lastTick = now; // la guarda para la próxima vuelta

      const container = pagesRef.current; //verifica si pagesref apunta al DIV que renderiza los capitulos
      if (!container) return; // todavía no se dibujó: esta vuelta no hace nada

      const isHidden = document.visibilityState === "hidden"; // ¿la pestaña está oculta o minimizada?
      const isIdle = now - lastActivity > IDLE_AFTER_SECONDS * 1000; // ¿pasaron más de 30 s sin tocar nada?
      const viewportHeight = window.innerHeight;  //es la parte alta visible de la pantalla

      container.querySelectorAll<HTMLElement>("[data-page-number]").forEach((element) => {  //buscamos dentro del div lo que tenga la etiqueta "data-page-number"
        const rect = element.getBoundingClientRect(); //devuelve en pixeles donde está la pagina con respecto a la pantalla
        const visibleTop = Math.max(rect.top, 0); //donde empieza, si es negativo la parte de arriba esta fuera de la pantalla
        const visibleBottom = Math.min(rect.bottom, viewportHeight); //donde termina, puede ser mayor que el alto si sigue abajo
        const visibleHeight = visibleBottom - visibleTop; //cuantos pixeles de pagina se ven
        if (visibleHeight <= 0 || rect.height <= 0) return; //si no se ve la pagina, pasa a la siguiente

        const page = Number(element.dataset.pageNumber); //etiqueta del data-page-number
        const share = visibleHeight / viewportHeight; //share es la parte de la pantalla que ocupa esta pagina.
        const time = pending.get(page) ?? { //buscamos la pagina en la libreta de pending.
          activeMs: 0,
          idleMs: 0,
          hiddenMs: 0,
          seen: seenMax.get(page) ?? 0, //aunque arranque en 0 los datos, cuanto se vio no retrocede.
        };

        if (isHidden) {  //si la pagina estaba oculta le sumamos a oculo
          time.hiddenMs += elapsed * share; // suma su parte del tiempo a "oculto"
        } else if (isIdle) { //si estaba incativa le sumamos a inactivo
          time.idleMs += elapsed * share; // suma su parte del tiempo a "inactivo"
        } else { //si no, suma a activo y actualizamos "visto"
          time.activeMs += elapsed * share; //si pasó 1 s y la pagina ocupa X porcenta, recibe ese porcentaje en ms
          const seenNow = Math.min(1, (visibleBottom - rect.top) / rect.height); //desde arriba de la pagina hasta lo inferior visible, que fraccion de pagina se ve
          const best = Math.max(seenMax.get(page) ?? 0, seenNow); //record de lo maximo visto, si bajó de pagina suma, si subió para ver se mantiene
          seenMax.set(page, best); //guardamos el record
          time.seen = best; //guardamos el record
        }

        pending.set(page, time); // guarda la fila en la libreta
      });

      msSinceSend += elapsed; // suma el tiempo desde el último latido
      if (msSinceSend >= HEARTBEAT_SECONDS * 1000) { // ¿ya pasaron 15 s?
        msSinceSend = 0; // reinicia la cuenta
        send(false); // manda el latido (normal, sin keepalive)
      }
    };

    // al ocultar la pestaña o cerrar la página, manda lo pendiente de inmediato
    const flush = () => {
      tick(); //hacemos una vuelta mas
      send(true); //keepalive se activa indicando que se cerró la pagina de lector y permitiendo enviar los datos aunque se haya cerrado
    };
    const onVisibilityChange = () => { // corre cuando la pestaña se oculta o vuelve a verse
      if (document.visibilityState === "hidden") flush(); //si se oculta la pestaña se envian los datos
    };

    postReading({ action: "open", chapterId, translationId }, false) //avisa si se abrió el capitulo
      .then((result) => {
        sessionId = result.sessionId ?? null;  //null es cuando se lee siendo autor o traductor, asique no manda data
      })
      .catch(() => {}); // si falla, no rompe el lector

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActivity, { passive: true })); // conecta cada evento (scroll, clic, tecla…) con markActivity
    document.addEventListener("visibilitychange", onVisibilityChange); // avisa cuando la pestaña se oculta o vuelve
    window.addEventListener("pagehide", flush); // cuando se cierra la pestaña o se sale del sitio: manda lo pendiente
    const interval = window.setInterval(tick, 1000); // el reloj: una vuelta (tick) cada 1 s

    return () => { // limpieza: corre al salir del lector o al cambiar de capítulo
      window.clearInterval(interval); // apaga el reloj
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActivity)); // deja de escuchar la actividad
      document.removeEventListener("visibilitychange", onVisibilityChange); // deja de escuchar la pestaña
      window.removeEventListener("pagehide", flush); // deja de escuchar el cierre
      flush(); // manda lo último pendiente
    };
  }, [pagesRef, chapterId, translationId, enabled]); // si cambia alguno (ej. el capítulo), se limpia y vuelve a empezar
}
