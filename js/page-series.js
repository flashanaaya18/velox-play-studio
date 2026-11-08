VeloxCatalogo({
  vista: 'series',
  gridSel: '#grid',
  filtrosSel: '#filtros',
  estadoSel: '#estado',
  extraSel: '#filtros-ext',
  filtros: [
    { key: 'novedades',    label: 'Novedades',         query: '' },
    { key: 'populares',    label: 'Más populares',     query: 'order=calificacion.desc.nullslast' },
    { key: 'temporadas',   label: 'Nuevas temporadas', query: 'temporada_nueva=eq.true' },
    { key: 'episodios',    label: 'Nuevos episodios',  query: 'episodio_nuevo=eq.true' }
  ]
});
