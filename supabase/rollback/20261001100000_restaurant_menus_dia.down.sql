-- Reversión de 20261001100000_restaurant_menus_dia.sql
-- ATENCIÓN: borra los menús del día de TODOS los tenants que los usen. Hacer copia antes si hay datos.
drop table if exists restaurant.menu_dia_platos;
drop table if exists restaurant.menus_dia;
