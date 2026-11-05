-- Añade +18 y expone generos en los views de catálogo
-- Ejecutar en SQL Editor de Supabase

alter table peliculas add column if not exists es_adulto boolean default false;
alter table series    add column if not exists es_adulto boolean default false;

create or replace view v_pelis_lista as
select id, titulo, anio, poster_url, backdrop_url, calificacion, generos,
       es_cam, episodio_nuevo, temporada_nueva, es_adulto, created_at
from peliculas
order by created_at desc;

create or replace view v_series_lista as
select id, titulo, anio, poster_url, backdrop_url, calificacion, generos,
       es_cam, episodio_nuevo, temporada_nueva, es_adulto, created_at
from series
order by created_at desc;
