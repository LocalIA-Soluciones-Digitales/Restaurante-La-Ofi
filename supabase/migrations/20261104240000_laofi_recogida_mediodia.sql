-- Recogida de comida (04/11/2026): solo a mediodía, de 13:00 a 15:30 (franjas cada
-- intervalo_min, la última a las 15:30 y siempre dentro del horario del local).
-- Los encargos de vino no tienen franjas: se recogen a cualquier hora con el local abierto.
update laofi.ajustes
set valor = valor || '{"desde": "13:00", "hasta": "15:30", "segun_horario": false}'::jsonb
where clave = 'recogida';
