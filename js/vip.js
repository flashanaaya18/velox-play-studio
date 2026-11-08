// Velox Play — página VIP (sin dependencias, compatible con CSP sin inline)
(function () {
  var y = document.getElementById('y');
  if (y) y.textContent = String(new Date().getFullYear());

  // Nav + hamburguesa móvil (misma lógica que app.js)
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('nav-toggle');
  if (navToggle && nav) {
    var cerrarNav = function () { nav.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); };
    navToggle.addEventListener('click', function () {
      var abierto = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('.nav__link')) cerrarNav(); });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.target.closest('#nav') || e.target.closest('#nav-toggle')) return;
      cerrarNav();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarNav(); });
  }

  // Mismos precios que la app (android/.../servicios/PreciosVip.kt).
  var PLANES = {
    mes_1: { nombre: 'Mensual', precio: 49 },
    mes_3: { nombre: 'Trimestral', precio: 129 },
    mes_6: { nombre: 'Semestral', precio: 239 },
    ano_1: { nombre: 'Anual', precio: 449 }
  };
  var form = document.getElementById('vip-solicitud');
  var estado = document.getElementById('vip-sol-estado');
  var elegido = null;
  document.querySelectorAll('.vip-elegir').forEach(function (b) {
    b.addEventListener('click', function () {
      elegido = b.getAttribute('data-plan');
      var p = PLANES[elegido];
      document.getElementById('vip-sol-titulo').textContent = 'Plan ' + p.nombre + ' · $' + p.precio + ' MXN';
      estado.textContent = '';
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('vip-contacto').focus({ preventScroll: true });
    });
  });
  if (form) form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var cfg = window.VELOX_CONFIG || {};
    var contacto = document.getElementById('vip-contacto').value.trim();
    var p = PLANES[elegido];
    if (!p || !contacto || !cfg.SUPABASE_URL) return;
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    estado.textContent = 'Enviando…';
    fetch(cfg.SUPABASE_URL + '/rest/v1/solicitudes_vip', {
      method: 'POST',
      headers: {
        apikey: cfg.SUPABASE_KEY,
        Authorization: 'Bearer ' + cfg.SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ plan_id: elegido, plan_nombre: p.nombre, precio_mxn: p.precio, contacto: contacto.slice(0, 120), origen: 'web' })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      estado.textContent = '¡Listo! Te contactaremos en ' + contacto + ' con los datos de pago de $' + p.precio + ' MXN.';
      form.reset();
    }).catch(function () {
      estado.textContent = 'No se pudo enviar. Inténtalo de nuevo en unos minutos.';
    }).finally(function () { btn.disabled = false; });
  });
})();
