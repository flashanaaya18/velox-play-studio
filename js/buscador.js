// Velox Play — buscador del encabezado (todas las páginas).
// Requiere js/config.js antes. Marcado esperado:
// <form class="search" id="buscador" role="search"><input id="q" ...><div id="buscador-resultados" ...></div></form>
(function () {
  'use strict';
  var CFG = window.VELOX_CONFIG || {};
  var SB = CFG.SUPABASE_URL, KEY = CFG.SUPABASE_KEY;
  var form = document.getElementById('buscador');
  var input = document.getElementById('q');
  var lista = document.getElementById('buscador-resultados');
  if (!form || !input || !lista) return;

  var temporizador = null, ultimaConsulta = '', controlador = null;
  var items = [], activo = -1;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"'`]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c];
    });
  }
  function urlSegura(u) { return /^https?:\/\//i.test(String(u || '')) ? String(u) : ''; }

  // Filtro PostgREST: año exacto o título/género
  function filtroDe(q) {
    if (/^\d{4}$/.test(q)) return 'anio=eq.' + q;
    var limpio = q.replace(/[(),*{}"]/g, ' ').trim();
    var genero = limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
    return 'or=' + encodeURIComponent('(titulo.ilike.*' + limpio + '*,generos.cs.{' + genero + '})');
  }

  function pedir(vista, filtro, signal) {
    return fetch(SB + '/rest/v1/' + vista + '?select=id,titulo,anio,poster_url&' + filtro, {
      signal: signal,
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Range-Unit': 'items', Range: '0-7', Accept: 'application/json' }
    }).then(function (r) { if (!r.ok) throw new Error('Supabase ' + r.status); return r.json(); });
  }

  function abrirLista() { lista.hidden = false; input.setAttribute('aria-expanded', 'true'); }
  function cerrarLista() {
    lista.hidden = true; input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant'); activo = -1;
  }

  function pintarMensaje(txt) {
    items = []; activo = -1;
    lista.innerHTML = '<div class="buscador-resultados__vacio" role="option" aria-disabled="true">' + esc(txt) + '</div>';
    abrirLista();
  }

  function pintar(resultados) {
    items = resultados; activo = -1;
    if (!resultados.length) { pintarMensaje('No se encontraron resultados'); return; }
    lista.innerHTML = resultados.map(function (it, i) {
      var poster = urlSegura(it.poster_url);
      return '<a class="buscador-item" role="option" id="bres-' + i + '" aria-selected="false" href="detalles.html?id=' +
        encodeURIComponent(it.id) + '&tipo=' + it.tipo + '">' +
        (poster ? '<img src="' + esc(poster) + '" alt="" width="40" height="60" loading="lazy" decoding="async" data-hide-on-error>' : '<span class="buscador-item__ph" aria-hidden="true"></span>') +
        '<span class="buscador-item__txt"><strong>' + esc(it.titulo || 'Sin título') + '</strong>' +
        '<small>' + esc([it.anio, it.tipo === 'serie' ? 'Serie' : 'Película'].filter(Boolean).join(' · ')) + '</small></span></a>';
    }).join('');
    abrirLista();
  }

  function marcar(i) {
    var nodos = lista.querySelectorAll('.buscador-item');
    if (!nodos.length) return;
    activo = (i + nodos.length) % nodos.length;
    nodos.forEach(function (n, k) { n.setAttribute('aria-selected', k === activo ? 'true' : 'false'); n.classList.toggle('is-activo', k === activo); });
    input.setAttribute('aria-activedescendant', nodos[activo].id);
    nodos[activo].scrollIntoView({ block: 'nearest' });
  }

  function buscar(q) {
    if (!SB || !KEY) return;
    if (controlador) controlador.abort();
    controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var signal = controlador ? controlador.signal : undefined;
    var filtro = filtroDe(q);
    pintarMensaje('Buscando…');
    Promise.all([pedir('v_pelis_lista', filtro, signal), pedir('v_series_lista', filtro, signal)])
      .then(function (r) {
        if (q !== ultimaConsulta) return; // llegó tarde
        var pelis = r[0].map(function (x) { x.tipo = 'pelicula'; return x; });
        var series = r[1].map(function (x) { x.tipo = 'serie'; return x; });
        pintar(pelis.concat(series).slice(0, 8));
      })
      .catch(function (e) { if (e.name !== 'AbortError') pintarMensaje('No se pudo buscar. Intenta de nuevo.'); });
  }

  // Debounce 250 ms, mínimo 2 caracteres
  input.addEventListener('input', function () {
    var q = input.value.trim();
    clearTimeout(temporizador);
    if (q.length < 2) { ultimaConsulta = ''; cerrarLista(); return; }
    temporizador = setTimeout(function () { ultimaConsulta = q; buscar(q); }, 250);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (lista.hidden && items.length) abrirLista(); marcar(activo + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(activo - 1); }
    else if (e.key === 'Escape') { if (!lista.hidden) { e.preventDefault(); e.stopPropagation(); cerrarLista(); } }
    else if (e.key === 'Enter' && activo >= 0 && !lista.hidden) {
      e.preventDefault();
      location.href = lista.querySelectorAll('.buscador-item')[activo].getAttribute('href');
    }
  });

  // Enter sin selección → index.html?q=texto (index pinta los resultados completos)
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (q) location.href = 'index.html?q=' + encodeURIComponent(q);
  });

  input.addEventListener('focus', function () { if (items.length && input.value.trim().length >= 2) abrirLista(); });
  document.addEventListener('click', function (e) { if (!form.contains(e.target)) cerrarLista(); });
})();
