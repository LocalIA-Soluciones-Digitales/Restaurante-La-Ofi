-- Reversión de 20261001100200_rpc_publicas_menu_eventos.sql
-- Ejecutar a mano (SQL Editor) y en este orden: 100200 → 100100 → 100000.
drop function if exists public.get_evento_publico(uuid, text);
drop function if exists public.get_eventos_publicos(uuid, boolean);
drop function if exists restaurant.evento_publico_json(restaurant.eventos);
drop function if exists public.get_menu_dia_publico(uuid, date);
