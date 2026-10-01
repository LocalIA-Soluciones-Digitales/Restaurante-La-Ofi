-- =============================================================================
-- Menú del día — vertical "restaurant" de LocalIA (genérico, no exclusivo de La Ofi)
-- -----------------------------------------------------------------------------
-- Aditiva: solo crea objetos nuevos en el schema restaurant. No toca ninguna
-- tabla existente ni a ningún otro tenant. Reversión: supabase/rollback/.
-- Mismo patrón multi-tenant que el resto del schema (Palomita-Bar, Bar La Osa):
--   · cliente_id → public.clientes
--   · RLS: is_developer() OR cliente_id = mi_cliente_id() para authenticated
--   · anon sin acceso directo: lectura pública solo vía RPC por site_key
-- NO APLICAR EN PRODUCCIÓN sin revisión (ver README → Supabase).
-- =============================================================================

create table if not exists restaurant.menus_dia (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fecha date not null,
  precio_centimos integer check (precio_centimos is null or precio_centimos >= 0),
  bebida_incluida boolean not null default false,
  pan_incluido boolean not null default false,
  postre_o_cafe boolean not null default false,
  notas text,
  disponible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menus_dia_cliente_fecha_key unique (cliente_id, fecha),
  -- Necesaria para que los platos referencien (menu, tenant) y no puedan colgar
  -- de un menú de otro tenant.
  constraint menus_dia_id_cliente_key unique (id, cliente_id)
);

comment on table restaurant.menus_dia is
  'Menú del día por tenant y fecha. Lo publica el encargado desde /admin. Lectura pública vía get_menu_dia_publico(site_key).';

create table if not exists restaurant.menu_dia_platos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  menu_id uuid not null,
  tipo text not null check (tipo in ('primero', 'segundo', 'postre')),
  nombre text not null check (length(btrim(nombre)) > 0),
  descripcion text,
  -- Mismo formato que restaurant.productos.alergenos (14 alérgenos UE en castellano).
  alergenos text[] not null default '{}',
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_dia_platos_menu_fkey
    foreign key (menu_id, cliente_id) references restaurant.menus_dia (id, cliente_id) on delete cascade
);

comment on table restaurant.menu_dia_platos is
  'Platos (primeros, segundos, postres) de un menú del día. El tenant debe coincidir con el del menú (FK compuesta).';

create index if not exists menu_dia_platos_menu_idx on restaurant.menu_dia_platos (menu_id, tipo, orden);

drop trigger if exists trg_menus_dia_updated_at on restaurant.menus_dia;
create trigger trg_menus_dia_updated_at
  before update on restaurant.menus_dia
  for each row execute function public.set_updated_at();

-- RLS ------------------------------------------------------------------------
alter table restaurant.menus_dia enable row level security;
alter table restaurant.menu_dia_platos enable row level security;

drop policy if exists menus_dia_all_admin on restaurant.menus_dia;
create policy menus_dia_all_admin on restaurant.menus_dia
  for all to authenticated
  using (public.is_developer() or cliente_id = public.mi_cliente_id())
  with check (public.is_developer() or cliente_id = public.mi_cliente_id());

drop policy if exists menu_dia_platos_all_admin on restaurant.menu_dia_platos;
create policy menu_dia_platos_all_admin on restaurant.menu_dia_platos
  for all to authenticated
  using (public.is_developer() or cliente_id = public.mi_cliente_id())
  with check (public.is_developer() or cliente_id = public.mi_cliente_id());

-- Permisos explícitos (coinciden con los privilegios por defecto del schema).
revoke all on restaurant.menus_dia, restaurant.menu_dia_platos from anon;
grant select, insert, update, delete on restaurant.menus_dia, restaurant.menu_dia_platos to authenticated;
grant all on restaurant.menus_dia, restaurant.menu_dia_platos to service_role;
