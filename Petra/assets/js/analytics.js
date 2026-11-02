/* ==========================================================================
   PETRASUR — Google Analytics 4 (opcional)
   --------------------------------------------------------------------------
   Para activar las estadísticas de visitas:
     1. Crea una cuenta gratuita en https://analytics.google.com
     2. Crea una "Propiedad" y copia tu ID de medición (formato G-XXXXXXXXXX).
     3. Reemplaza el valor de GA_ID aquí abajo.
   Mientras el ID siga siendo el de ejemplo, este archivo no hace nada.
   ========================================================================== */
(function () {
  'use strict';

  var GA_ID = 'G-XXXXXXXXXX'; // <-- Reemplaza por tu ID de medición real

  // Si no se ha configurado un ID real, no cargamos nada.
  if (!GA_ID || GA_ID.indexOf('XXXX') !== -1) { return; }

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
})();
