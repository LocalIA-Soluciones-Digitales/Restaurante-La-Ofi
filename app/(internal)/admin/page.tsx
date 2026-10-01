// /admin — SOLO PREPARADO. Se construirá con Supabase Auth sobre el schema propio
// laofi: la RLS ya limita la escritura a LocalIA y al staff de La Ofi
// (laofi.es_gestor()). Esta página no expone datos ni requiere sesión.

const MODULOS = [
  { nombre: "Menú del día", tabla: "laofi.menus_dia · laofi.menu_dia_platos" },
  { nombre: "Carta, precios, fotos y disponibilidad", tabla: "laofi.categorias · laofi.productos" },
  { nombre: "Eventos", tabla: "laofi.eventos" },
  { nombre: "Horario", tabla: "laofi.horario" },
  { nombre: "Reservas", tabla: "laofi.reservas (siguiente fase)" },
  { nombre: "Pedidos desde mesa y cocina", tabla: "laofi.mesas · laofi.pedidos (siguiente fase)" },
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracota">La Ofi · Administración</p>
      <h1 className="mt-3 font-display text-4xl">Panel en preparación</h1>
      <p className="mt-4 text-carbon-muted">
        Desde aquí el equipo de La Ofi podrá publicar el menú del día, editar la carta y gestionar eventos, reservas y
        pedidos.
      </p>
      <ul className="mt-8 divide-y divide-carbon/10 rounded-2xl border border-carbon/10 bg-white">
        {MODULOS.map((m) => (
          <li key={m.nombre} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:justify-between">
            <span className="font-medium">{m.nombre}</span>
            <code className="text-xs text-carbon-muted">{m.tabla}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
