// Avisos sonoros del panel (portado de notify-sound de Palomita): tonos
// generados con Web Audio, sin ficheros. Los navegadores solo permiten sonar
// tras una interacción del usuario: el KDS pide un toque para "activar sonido".

let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

/** Desbloquea el audio (llamar desde un gesto del usuario). */
export function activarSonido(): boolean {
  const c = contexto();
  if (!c) return false;
  void c.resume();
  return true;
}

const PATRONES = {
  // Pedido nuevo: dos notas ascendentes, claras sobre el ruido de cocina.
  nuevo: [
    [880, 0, 0.16],
    [1320, 0.18, 0.22],
  ],
  // Aviso de mesa (camarero / cuenta): tres pulsos cortos.
  aviso: [
    [660, 0, 0.1],
    [660, 0.15, 0.1],
    [990, 0.3, 0.16],
  ],
  // Pedido listo.
  listo: [
    [1046, 0, 0.12],
    [1318, 0.13, 0.12],
    [1568, 0.26, 0.24],
  ],
} as const;

export function sonarAviso(tipo: keyof typeof PATRONES = "nuevo") {
  const c = contexto();
  if (!c || c.state !== "running") return;
  const t0 = c.currentTime;
  for (const [freq, inicio, dur] of PATRONES[tipo]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + inicio);
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + inicio + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + inicio + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + inicio);
    osc.stop(t0 + inicio + dur + 0.05);
  }
}
