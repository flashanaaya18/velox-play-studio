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
})();
