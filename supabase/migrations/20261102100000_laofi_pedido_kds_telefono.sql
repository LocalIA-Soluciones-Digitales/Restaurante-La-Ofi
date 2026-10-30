-- «Pedidos» para el encargado (30/10/2026): Carlos gestiona los pedidos para recoger
-- desde su propia pantalla (no desde Cocina y barra) y necesita poder llamar al cliente.
-- pedido_kds_json devuelve también el teléfono; lo demás, igual.

create or replace function laofi.pedido_kds_json(p laofi.pedidos)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'numero_dia', p.numero_dia, 'tipo', p.tipo, 'estado', p.estado, 'origen', p.origen,
    'payment_method', p.payment_method, 'payment_status', p.payment_status, 'total_centimos', p.total_centimos,
    'notas', p.notas, 'nombre_cliente', p.nombre_cliente, 'telefono', p.telefono, 'recogida_en', p.recogida_en,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'mesa', (select jsonb_build_object('id', m.id, 'numero', m.numero, 'nombre', m.nombre, 'comensales', m.comensales,
                                       'zona', (select z.nombre from laofi.zonas z where z.id = m.zona_id))
             from laofi.mesas m where m.id = p.mesa_id),
    'grupo', (select g.nombre from laofi.grupos_pedido g where g.id = p.grupo_id),
    'participante', (select sp.nombre from laofi.sesion_participantes sp where sp.id = p.participante_id),
    'camarero', (select s.nombre from laofi.staff s where s.user_id = p.creado_por),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'nombre', i.nombre, 'cantidad', i.cantidad, 'precio_unitario_centimos', i.precio_unitario_centimos,
        'modificadores', i.modificadores, 'notas', i.notas, 'estacion', i.estacion, 'estado', i.estado,
        'iva_pct', i.iva_pct, 'invitacion', i.invitacion) order by i.created_at)
      from laofi.pedido_items i where i.pedido_id = p.id), '[]'::jsonb)
  );
$$;
