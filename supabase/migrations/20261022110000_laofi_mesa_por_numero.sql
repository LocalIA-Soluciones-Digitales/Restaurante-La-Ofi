-- Pedir en mesa sin QR: el cliente escribe el número de su mesa en /pedir.
--
-- El token del QR es la «llave» de la mesa (regenerarlo invalida el impreso), así
-- que el número solo abre la mesa si YA está abierta: sentada por sala (Salón o
-- TPV) o con una sesión de pedido activa. Una mesa vacía no recibe pedidos desde
-- fuera; el cliente ve que debe avisar al personal o pedir para recoger en barra.
--
-- Devuelve:
--   {"estado": "abierta", "token": …}  → la web le lleva a la carta de su mesa
--   {"estado": "cerrada"}              → existe pero nadie la ha abierto
--   null                               → no hay ninguna mesa activa con ese número

create or replace function public.laofi_mesa_por_numero(p_site_key uuid, p_numero text)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  with buscada as (
    -- «mesa 7», « t3 », «Mesa T-3» → «7», «T3»
    select upper(regexp_replace(regexp_replace(btrim(coalesce(p_numero, '')), '^mesa\s*', '', 'i'), '[\s-]', '', 'g')) as n
  )
  select case
           when m.ocupada or exists (select 1 from laofi.mesa_sesiones s where s.mesa_id = m.id and s.estado = 'ACTIVA')
             then jsonb_build_object('estado', 'abierta', 'token', m.token)
           else jsonb_build_object('estado', 'cerrada')
         end
  from laofi.mesas m, buscada b
  where laofi.site_key_valida(p_site_key) and m.activa and b.n <> ''
    and upper(regexp_replace(m.numero, '[\s-]', '', 'g')) = b.n
  limit 1;
$$;

revoke all on function public.laofi_mesa_por_numero(uuid, text) from public;
grant execute on function public.laofi_mesa_por_numero(uuid, text) to anon, authenticated, service_role;
