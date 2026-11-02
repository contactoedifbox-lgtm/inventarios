/* ==========================================================================
   PETRASUR — JavaScript principal
   Header, menú móvil, animaciones, galería con lightbox y formulario.
   ========================================================================== */
(function () {
  'use strict';

  /* Marca que JavaScript está activo (habilita las animaciones de aparición) */
  document.documentElement.classList.add('js');

  /* -------------------- Header: sombra al hacer scroll -------------------- */
  var header = document.getElementById('site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------ Menú móvil ------------------------------ */
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --------------------------- Año en el footer --------------------------- */
  var year = document.getElementById('year');
  if (year) { year.textContent = new Date().getFullYear(); }

  /* ------------------------ Animación de aparición ------------------------ */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* -------------------------------- Galería ------------------------------- */
  var grid = document.getElementById('gallery-grid');
  if (grid && window.GALERIA) { initGallery(grid); }

  function initGallery(grid) {
    var filtersEl = document.getElementById('gallery-filters');
    var obras = window.GALERIA || [];
    var flat = [];
    var current = 'todos';

    var cats = ['todos'];
    obras.forEach(function (o) {
      if (o.categoria && cats.indexOf(o.categoria) === -1) { cats.push(o.categoria); }
    });

    if (filtersEl) {
      filtersEl.innerHTML = cats.map(function (c) {
        return '<button type="button" class="filter-btn' + (c === 'todos' ? ' is-active' : '') +
          '" data-filter="' + c + '">' + labelCat(c) + '</button>';
      }).join('');
      filtersEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter-btn');
        if (!btn) { return; }
        current = btn.dataset.filter;
        filtersEl.querySelectorAll('.filter-btn').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        render();
      });
    }

    function labelCat(c) {
      var map = { todos: 'Todos', canales: 'Canales', taludes: 'Taludes', otros: 'Otros' };
      return map[c] || (c.charAt(0).toUpperCase() + c.slice(1));
    }

    function render() {
      flat = [];
      var html = '';
      obras.forEach(function (obra) {
        if (current !== 'todos' && obra.categoria !== current) { return; }
        (obra.media || []).forEach(function (m) {
          var idx = flat.length;
          flat.push({ media: m, obra: obra });
          var isVideo = m.tipo === 'video';
          html += '<button type="button" class="gallery-item" data-index="' + idx +
            '" aria-label="Ver ' + escapeAttr(obra.titulo) + '">';
          if (isVideo) {
            html += '<img src="' + escapeAttr(m.poster || '') + '" alt="' +
              escapeAttr(m.alt || obra.titulo) + '" loading="lazy">';
            html += '<span class="gallery-item__play"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>';
          } else {
            html += '<img src="' + escapeAttr(m.src) + '" alt="' +
              escapeAttr(m.alt || obra.titulo) + '" loading="lazy">';
          }
          html += '<span class="gallery-item__overlay"><strong>' + escapeHtml(obra.titulo) +
            '</strong><span>' + escapeHtml(obra.ubicacion || '') + '</span></span>';
          html += '</button>';
        });
      });
      grid.innerHTML = html || '<p class="gallery-empty">Aún no hay obras en esta categoría.</p>';
    }

    /* Lightbox */
    var lb = document.getElementById('lightbox');
    var lbContent = lb ? lb.querySelector('.lightbox__content') : null;
    var lbCaption = lb ? lb.querySelector('.lightbox__caption') : null;
    var lbIndex = 0;

    grid.addEventListener('click', function (e) {
      var item = e.target.closest('.gallery-item');
      if (!item) { return; }
      openLightbox(parseInt(item.dataset.index, 10));
    });

    function openLightbox(i) {
      if (!lb) { return; }
      lbIndex = i;
      showMedia();
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      if (!lb) { return; }
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lbContent) { lbContent.innerHTML = ''; }
    }
    function showMedia() {
      var entry = flat[lbIndex];
      if (!entry || !lbContent) { return; }
      var m = entry.media;
      if (m.tipo === 'video') {
        lbContent.innerHTML = '<video src="' + escapeAttr(m.src) + '" controls autoplay playsinline></video>';
      } else {
        lbContent.innerHTML = '<img src="' + escapeAttr(m.src) + '" alt="' +
          escapeAttr(m.alt || entry.obra.titulo) + '">';
      }
      if (lbCaption) {
        lbCaption.textContent = entry.obra.titulo +
          (entry.obra.ubicacion ? ' — ' + entry.obra.ubicacion : '');
      }
    }
    function nav(dir) {
      if (!flat.length) { return; }
      lbIndex = (lbIndex + dir + flat.length) % flat.length;
      showMedia();
    }

    if (lb) {
      var closeBtn = lb.querySelector('.lightbox__close');
      var prev = lb.querySelector('.lightbox__nav--prev');
      var next = lb.querySelector('.lightbox__nav--next');
      if (closeBtn) { closeBtn.addEventListener('click', closeLightbox); }
      if (prev) { prev.addEventListener('click', function () { nav(-1); }); }
      if (next) { next.addEventListener('click', function () { nav(1); }); }
      lb.addEventListener('click', function (e) { if (e.target === lb) { closeLightbox(); } });
      document.addEventListener('keydown', function (e) {
        if (!lb.classList.contains('is-open')) { return; }
        if (e.key === 'Escape') { closeLightbox(); }
        if (e.key === 'ArrowLeft') { nav(-1); }
        if (e.key === 'ArrowRight') { nav(1); }
      });
    }

    render();
  }

  /* --------------------------- Formulario contacto ------------------------ */
  var form = document.getElementById('contact-form');
  if (form) {
    var status = document.getElementById('form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var honey = form.querySelector('[name="_honey"]');
      if (honey && honey.value) { return; }
      var btn = form.querySelector('[type="submit"]');
      var original = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
      if (status) { status.className = 'form-status'; status.textContent = ''; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; })
            .then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            showStatus('success', '¡Gracias! Hemos recibido tu solicitud. Te contactaremos a la brevedad.');
          } else {
            showStatus('error', 'No pudimos enviar el formulario automáticamente. Escríbenos a contacto@petrasur.cl o por WhatsApp.');
          }
        })
        .catch(function () {
          showStatus('error', 'No pudimos enviar el formulario (revisa tu conexión). Escríbenos a contacto@petrasur.cl o por WhatsApp.');
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = original; }
        });
    });

    function showStatus(type, msg) {
      if (!status) { return; }
      status.className = 'form-status is-visible is-' + type;
      status.textContent = msg;
      status.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* -------------------------------- Helpers ------------------------------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      switch (c) {
        case '&': return '&' + 'amp;';
        case '<': return '&' + 'lt;';
        case '>': return '&' + 'gt;';
        case '"': return '&' + 'quot;';
        default: return '&' + '#39;';
      }
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }
})();
