-- =============================================================================
-- Eventos — vertical "restaurant" de LocalIA (tardeos, música, partidos, privados)
-- -----------------------------------------------------------------------------
-- Aditiva. No reutiliza public.reservas_eventos a propósito: esa tabla modela
-- encargos con fecha de entrega de otro vertical (pescadería) y no encaja.
-- Reversión: supabase/rollback/. NO APLICAR EN PRODUCCIÓN sin revisión.
-- =============================================================================

create table if not exists restaurant.eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  titulo text not null check (length(btrim(titulo)) > 0),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tipo text,
  descripcion text,
  imagen_url text,
  fecha date not null,
  hora time,
  precio_centimos integer check (precio_centimos is null or precio_centimos >= 0),
  aforo integer check (aforo is null or aforo > 0),
  estado text not null default 'proximo'
    check (estado in ('proximo', 'agotado', 'finalizado', 'cancelado')),
  enlace_reserva text check (enlace_reserva is null or enlace_reserva ~ '^https://'),
  -- Borrador vs publicado: permite preparar eventos en /admin sin que salgan en la web.
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eventos_cliente_slug_key unique (cliente_id, slug)
);

comment on table restaurant.eventos is
  'Eventos por tenant. Lectura pública vía get_eventos_publicos / get_evento_publico (solo publicados).';

create index if not exists eventos_cliente_fecha_idx on restaurant.eventos (cliente_id, fecha);

drop trigger if exists trg_eventos_updated_at on restaurant.eventos;
create trigger trg_eventos_updated_at
  before update on restaurant.eventos
  for each row execute function public.set_updated_at();

alter table restaurant.eventos enable row level security;

drop policy if exists eventos_all_admin on restaurant.eventos;
create policy eventos_all_admin on restaurant.eventos
  for all to authenticated
  using (public.is_developer() or cliente_id = public.mi_cliente_id())
  with check (public.is_developer() or cliente_id = public.mi_cliente_id());

revoke all on restaurant.eventos from anon;
grant select, insert, update, delete on restaurant.eventos to authenticated;
grant all on restaurant.eventos to service_role;
