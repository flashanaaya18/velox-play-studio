-- Añade +18 y expone generos en los views de catálogo.
-- Ejecutar en SQL Editor de Supabase.
-- Importante: hay que DROP VIEW antes de recrear porque PostgreSQL no permite
-- insertar columnas nuevas en medio del orden existente con CREATE OR REPLACE VIEW.

alter table peliculas add column if not exists es_adulto boolean default false;
alter table series    add column if not exists es_adulto boolean default false;

drop view if exists v_pelis_lista;
create view v_pelis_lista as
select id, titulo, anio, poster_url, backdrop_url, calificacion,
       es_cam, episodio_nuevo, temporada_nueva, created_at,
       generos, es_adulto
from peliculas
order by created_at desc;

drop view if exists v_series_lista;
create view v_series_lista as
select id, titulo, anio, poster_url, backdrop_url, calificacion,
       es_cam, episodio_nuevo, temporada_nueva, created_at,
       generos, es_adulto
from series
order by created_at desc;
