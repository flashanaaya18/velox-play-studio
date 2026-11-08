VeloxCatalogo({
  vista: 'peliculas',
  gridSel: '#grid',
  filtrosSel: '#filtros',
  estadoSel: '#estado',
  extraSel: '#filtros-ext',
  filtros: [
    { key: 'estrenos',   label: 'Estrenos',     query: '' },
    { key: 'populares',  label: 'Más populares', query: 'order=calificacion.desc.nullslast' },
    { key: 'cam',        label: 'En cines (CAM)', query: 'es_cam=eq.true' }
  ]
});
