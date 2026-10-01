-- =============================================================================
-- Restaurante La Ofi — schema propio `laofi`
-- -----------------------------------------------------------------------------
-- Todas las tablas de La Ofi viven en su propio schema: ningún dato se comparte
-- ni puede cruzarse con otros proyectos de LocalIA (Palomita, Bar La Osa,
-- Arrantza, Amway…). Lo único común es su fila en public.clientes, el registro de
-- tenants de la plataforma (site_key, estado y vínculo de usuarios del /admin).
--
-- Acceso:
--   · anon: SIN acceso al schema. La web pública lee solo con las RPC
--     public.laofi_* (migración 20261001150100), que validan la site_key.
--   · authenticated: RLS → solo LocalIA (is_developer) o staff de La Ofi
--     (usuarios_negocio.cliente_id = La Ofi). Base del futuro /admin.
--   · service_role: completo (solo servidor).
-- Aditiva: no modifica ningún objeto existente. Reversión: supabase/rollback/.
-- =============================================================================

create schema if not exists laofi;
comment on schema laofi is 'Restaurante La Ofi (Derio). Datos exclusivos de este tenant.';

revoke all on schema laofi from public, anon;
grant usage on schema laofi to authenticated, service_role;

-- Identidad del tenant ---------------------------------------------------------
-- id de La Ofi en el registro de tenants (null si aún no está dado de alta).
create or replace function laofi.cliente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.clientes where slug = 'restaurante-la-ofi';
$$;

-- ¿Puede el usuario autenticado gestionar La Ofi? (LocalIA o staff del tenant)
create or replace function laofi.es_gestor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_developer(), false)
      or (public.mi_cliente_id() is not null and public.mi_cliente_id() = laofi.cliente_id());
$$;

-- ¿La site_key recibida es la de La Ofi y el tenant está activo?
create or replace function laofi.site_key_valida(p_site_key uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select laofi.cliente_id() is not null
     and public.cliente_id_from_site_key(p_site_key) = laofi.cliente_id();
$$;

revoke all on function laofi.cliente_id(), laofi.es_gestor(), laofi.site_key_valida(uuid) from public, anon;
grant execute on function laofi.cliente_id(), laofi.es_gestor(), laofi.site_key_valida(uuid) to authenticated, service_role;

-- Los 14 alérgenos del Reglamento (UE) 1169/2011, como claves normalizadas.
create or replace function laofi.alergenos_validos(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p <@ array['gluten', 'crustaceos', 'huevo', 'pescado', 'cacahuetes', 'soja', 'lacteos',
                    'frutos_cascara', 'apio', 'mostaza', 'sesamo', 'sulfitos', 'altramuces', 'moluscos'];
$$;

-- Carta ----------------------------------------------------------------------
create table laofi.categorias (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (length(btrim(nombre)) > 0),
  -- Texto que se muestra bajo el título (p. ej. procedencia de los precios).
  descripcion text,
  tipo text not null default 'comida' check (tipo in ('comida', 'bebida')),
  orden smallint not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table laofi.productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references laofi.categorias(id) on delete restrict,
  nombre text not null check (length(btrim(nombre)) > 0),
  descripcion text,
  -- null = "Consultar precio" (p. ej. pescado según mercado).
  precio_centimos integer check (precio_centimos is null or precio_centimos >= 0),
  imagen_url text,
  alergenos text[] not null default '{}' check (laofi.alergenos_validos(alergenos)),
  disponible boolean not null default true,
  destacado boolean not null default false,
  orden smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Cubre la FK (categoria_id) y el orden de la carta en una sola estructura.
create index productos_categoria_orden_idx on laofi.productos (categoria_id, orden);

-- Menú / plato del día -----------------------------------------------------------
create table laofi.menus_dia (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  precio_centimos integer check (precio_centimos is null or precio_centimos >= 0),
  bebida_incluida boolean not null default false,
  pan_incluido boolean not null default false,
  postre_o_cafe boolean not null default false,
  notas text,
  disponible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table laofi.menu_dia_platos (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references laofi.menus_dia(id) on delete cascade,
  -- primero/segundo/postre = menú clásico; plato = plato del día a elegir.
  tipo text not null check (tipo in ('plato', 'primero', 'segundo', 'postre')),
  nombre text not null check (length(btrim(nombre)) > 0),
  descripcion text,
  alergenos text[] not null default '{}' check (laofi.alergenos_validos(alergenos)),
  orden smallint not null default 0
);
create index menu_dia_platos_menu_idx on laofi.menu_dia_platos (menu_id, tipo, orden);

-- Eventos ----------------------------------------------------------------------
create table laofi.eventos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo text not null check (length(btrim(titulo)) > 0),
  tipo text,
  descripcion text,
  imagen_url text,
  fecha date not null,
  hora time,
  precio_centimos integer check (precio_centimos is null or precio_centimos >= 0),
  aforo integer check (aforo is null or aforo > 0),
  estado text not null default 'proximo' check (estado in ('proximo', 'agotado', 'finalizado', 'cancelado')),
  enlace_reserva text check (enlace_reserva is null or enlace_reserva ~ '^https://'),
  -- Borradores: se preparan en /admin sin salir en la web.
  publicado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index eventos_publicados_fecha_idx on laofi.eventos (fecha) where publicado;

-- Horario ----------------------------------------------------------------------
create table laofi.horario (
  dia smallint primary key check (dia between 1 and 7), -- 1 = lunes … 7 = domingo (ISO)
  estado text not null check (estado in ('abierto', 'cerrado', 'consultar')),
  desde time,
  hasta time, -- 00:00 = medianoche (cierre al final del día)
  updated_at timestamptz not null default now(),
  check (estado <> 'abierto' or (desde is not null and hasta is not null))
);

-- updated_at (función compartida de la plataforma) --------------------------------
create trigger trg_categorias_updated_at before update on laofi.categorias for each row execute function public.set_updated_at();
create trigger trg_productos_updated_at before update on laofi.productos for each row execute function public.set_updated_at();
create trigger trg_menus_dia_updated_at before update on laofi.menus_dia for each row execute function public.set_updated_at();
create trigger trg_eventos_updated_at before update on laofi.eventos for each row execute function public.set_updated_at();
create trigger trg_horario_updated_at before update on laofi.horario for each row execute function public.set_updated_at();

-- RLS: toda tabla cerrada salvo para gestores de La Ofi --------------------------
do $$
declare t text;
begin
  foreach t in array array['categorias', 'productos', 'menus_dia', 'menu_dia_platos', 'eventos', 'horario'] loop
    execute format('alter table laofi.%I enable row level security', t);
    execute format('create policy %I on laofi.%I for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor())', t || '_gestores', t);
    execute format('revoke all on laofi.%I from public, anon', t);
    execute format('grant select, insert, update, delete on laofi.%I to authenticated', t);
    execute format('grant all on laofi.%I to service_role', t);
  end loop;
end;
$$;
