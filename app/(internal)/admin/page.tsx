// /admin — SOLO PREPARADO. El panel se construirá reutilizando el de Palomita-Bar
// (Supabase Auth + RPC de admin con p_cliente_id + RLS por tenant). El modelo de
// datos ya permite gestionar todo lo de esta lista sin rehacer nada (ver
// ARCHITECTURE.md §6). Esta página no expone datos ni requiere sesión.

const MODULOS = [
  { nombre: "Menú del día", tabla: "restaurant.menus_dia · menu_dia_platos" },
  { nombre: "Carta, precios, fotos y disponibilidad", tabla: "restaurant.categorias · productos" },
  { nombre: "Eventos", tabla: "restaurant.eventos" },
  { nombre: "Reservas", tabla: "restaurant.reservas (compartida)" },
  { nombre: "Pedidos desde mesa y cocina", tabla: "restaurant.pedidos · pedido_items · mesas" },
  { nombre: "Horario", tabla: "public.settings (key = horario)" },
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
