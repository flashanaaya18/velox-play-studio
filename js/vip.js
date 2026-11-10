// Velox Play — página VIP (sin dependencias, compatible con CSP sin inline)
(function () {
  // Año, menú y anuncios los gestiona js/ui.js (único dueño del menú).

  // Mismos precios que la app (android/.../servicios/PreciosVip.kt).
  var PLANES = {
    mes_1: { nombre: 'Mensual', precio: 49 },
    mes_3: { nombre: 'Trimestral', precio: 129 },
    mes_6: { nombre: 'Semestral', precio: 239 },
    ano_1: { nombre: 'Anual', precio: 449 }
  };
  var DIAS = { mes_1: 30, mes_3: 90, mes_6: 180, ano_1: 365 };
  document.querySelectorAll('.vip-elegir').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-plan');
      var p = PLANES[id];
      var texto = 'Hola, quiero el plan VIP ' + p.nombre + ' (' + DIAS[id] + ' días) de Velox Play por $' + p.precio + ' MXN. ¿Cómo pago?';
      window.open('https://wa.me/525616840524?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    });
  });
})();
