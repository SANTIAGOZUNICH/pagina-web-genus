/**
 * GENUS — Mobile Menu Premium
 * Construye el drawer desde los links existentes en el nav desktop.
 * No modifica desktop ni URLs.
 */
(function () {
  'use strict';

  var MOBILE_MAX = 900;

  var ICONS = {
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    users: '<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 20v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6.5L5.5 18a2.5 2.5 0 0 0 2.2 3.7h8.6a2.5 2.5 0 0 0 2.2-3.7L14 9.5V3"/>',
    box: '<path d="M12 22s8-4 8-10V6l-8-4-8 4v6c0 6 8 10 8 10z"/><path d="M12 22V12"/><path d="M20 6l-8 4-8-4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
    default: '<circle cx="12" cy="12" r="9"/>'
  };

  var HREF_ICON = {
    '/': 'home',
    '': 'home',
    'index.html': 'home',
    'quienes-somos': 'users',
    'productos': 'flask',
    'llave-en-mano': 'box',
    'calidad': 'shield',
    'contacto': 'mail'
  };

  function iconSvg(name) {
    var paths = ICONS[name] || ICONS.default;
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>';
  }

  function iconForHref(href) {
    var key = (href || '').replace(/^\//, '').replace(/\.html$/, '').split('?')[0];
    if (!key || key === '/') return 'home';
    return HREF_ICON[key] || 'default';
  }

  function isProductLink(a) {
    var href = (a.getAttribute('href') || '').toLowerCase();
    return a.classList.contains('nav-create-product') || href.indexOf('crea-tu-producto') !== -1;
  }

  function isActiveLink(a) {
    return a.classList.contains('act') || a.classList.contains('active');
  }

  function normalizeHref(href) {
    return href || '/';
  }

  function arrowSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  }

  function sparkleSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4z"/><path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5z"/></svg>';
  }

  function waSvg() {
    return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.089.539 4.048 1.481 5.751L0 24l6.389-1.474A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.803 9.803 0 0 1-5.003-1.372l-.359-.213-3.721.858.88-3.62-.234-.372A9.795 9.795 0 0 1 2.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/></svg>';
  }

  function buildDrawer(config) {
    var linksHtml = config.links.map(function (link) {
      var cls = 'g-mnav-link' + (link.active ? ' is-active' : '');
      return (
        '<a class="' + cls + '" href="' + link.href + '">' +
          '<span class="g-mnav-link-icon">' + iconSvg(iconForHref(link.href)) + '</span>' +
          '<span class="g-mnav-link-text">' + link.label + '</span>' +
        '</a>'
      );
    }).join('');

    var productCard = '';
    if (config.productLink) {
      productCard =
        '<a class="g-mnav-card g-mnav-card--product" href="' + config.productLink.href + '">' +
          '<span class="g-mnav-card-icon">' + sparkleSvg() + '</span>' +
          '<span class="g-mnav-card-body">' +
            '<span class="g-mnav-card-title">Crea tu producto <span class="g-mnav-badge">NUEVO</span></span>' +
            '<span class="g-mnav-card-desc">Fórmula personalizada en simples pasos.</span>' +
          '</span>' +
          '<span class="g-mnav-card-arrow">' + arrowSvg() + '</span>' +
        '</a>';
    }

    var waCard =
      '<a class="g-mnav-card g-mnav-card--wa" href="' + config.waHref + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="g-mnav-card-icon">' + waSvg() + '</span>' +
        '<span class="g-mnav-card-body">' +
          '<span class="g-mnav-card-title">Escribinos por WhatsApp</span>' +
          '<span class="g-mnav-card-desc">Te respondemos al instante</span>' +
        '</span>' +
        '<span class="g-mnav-card-arrow">' + arrowSvg() + '</span>' +
      '</a>';

    var overlay = document.createElement('div');
    overlay.className = 'g-mnav-overlay';
    overlay.id = 'gMnavOverlay';
    overlay.setAttribute('aria-hidden', 'true');

    var panel = document.createElement('aside');
    panel.className = 'g-mnav';
    panel.id = 'gMnavPanel';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Menú de navegación');
    panel.innerHTML =
      '<div class="g-mnav-header">' +
        '<a class="g-mnav-logo" href="/"><img src="assets/logo-genus.png" alt="Laboratorio Genus"></a>' +
        '<button type="button" class="g-mnav-close" id="gMnavClose" aria-label="Cerrar menú">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="g-mnav-scroll">' +
        '<a class="g-mnav-cta" href="' + config.ctaHref + '">SOLICITAR COTIZACIÓN →</a>' +
        '<nav class="g-mnav-links" aria-label="Secciones">' + linksHtml + '</nav>' +
        productCard +
        waCard +
      '</div>' +
      '<footer class="g-mnav-footer">' +
        '<p>© 2026 Laboratorio Genus</p>' +
        '<p>Todos los derechos reservados</p>' +
      '</footer>';

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    return { overlay: overlay, panel: panel };
  }

  function collectConfig() {
    var navList = document.querySelector('.hn-links') || document.querySelector('.g-nav-links');
    if (!navList) return null;

    var anchors = Array.prototype.slice.call(navList.querySelectorAll('a'));
    var links = [];
    var productLink = null;

    anchors.forEach(function (a) {
      if (isProductLink(a)) {
        productLink = {
          href: normalizeHref(a.getAttribute('href')),
          active: isActiveLink(a)
        };
        return;
      }
      var label = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (!label) return;
      links.push({
        href: normalizeHref(a.getAttribute('href')),
        label: label,
        active: isActiveLink(a)
      });
    });

    var ctaEl = document.querySelector('.hn-cta');
    var ctaHref = ctaEl ? normalizeHref(ctaEl.getAttribute('href')) : 'cotizador';

    var waEl = document.querySelector('.hn-wa') || document.querySelector('.g-btn-wa');
    var waHref = waEl ? (waEl.getAttribute('href') || 'https://wa.me/5491124980861') : 'https://wa.me/5491124980861';

    return {
      links: links,
      productLink: productLink,
      ctaHref: ctaHref,
      waHref: waHref
    };
  }

  function init() {
    var hamBtn = document.getElementById('ham') || document.getElementById('hamburger');
    var config = collectConfig();
    if (!hamBtn || !config) return;

    var ui = buildDrawer(config);
    var closeBtn = document.getElementById('gMnavClose');

    function setOpen(open) {
      document.body.classList.toggle('mnav-open', open);
      ui.overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
      ui.panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      hamBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function openMenu() {
      setOpen(true);
      if (closeBtn) closeBtn.focus();
    }

    function closeMenu() {
      setOpen(false);
    }

    hamBtn.setAttribute('aria-expanded', 'false');
    hamBtn.setAttribute('aria-controls', 'gMnavPanel');

    hamBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (document.body.classList.contains('mnav-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeMenu();
    });

    ui.overlay.addEventListener('click', closeMenu);

    ui.panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('mnav-open')) {
        closeMenu();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > MOBILE_MAX && document.body.classList.contains('mnav-open')) {
        closeMenu();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
