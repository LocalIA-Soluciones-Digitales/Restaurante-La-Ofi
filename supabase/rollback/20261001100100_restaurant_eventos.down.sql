-- Reversión de 20261001100100_restaurant_eventos.sql
-- ATENCIÓN: borra los eventos de TODOS los tenants que usen restaurant.eventos.
-- Hacer copia antes si ya hay datos: create table restaurant.eventos_backup_<fecha> as select * from restaurant.eventos;
drop table if exists restaurant.eventos;
