// Service worker del panel (alcance /admin): solo recibe los avisos al móvil
// (Web Push) que manda la Edge Function push-notify de la plataforma y, al
// tocarlos, abre la sección del panel. No guarda nada en caché.
export const dynamic = "force-static";

const SW = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "La Ofi", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      // Que suene y vibre; si llega otro con la misma etiqueta, vuelve a sonar.
      silent: false,
      renotify: Boolean(data.tag),
      vibrate: [200, 100, 200, 100, 400],
      data: { url: data.url || "/admin" },
    }),
  );
});

// Al tocar el aviso: reutiliza una ventana del panel si ya está abierta.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const panel = ventanas.find((w) => new URL(w.url).pathname.startsWith("/admin"));
      if (panel) return panel.navigate(url).then((w) => (w || panel).focus());
      return self.clients.openWindow(url);
    }),
  );
});
`;

export function GET() {
  return new Response(SW, {
    headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
