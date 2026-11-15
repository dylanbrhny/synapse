(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  // --- scroll progress bar ---
  var bar = document.getElementById('scroll-progress');
  if (bar) {
    function onScroll() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
    }
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- tag elements for scroll reveal ---
  var autoSelectors = [
    '.section-tag',
    '.speed-row', '.speed-note',
    '.intel-visual', '.intel-row', '.points-list li', '.callout',
    '.tl-card', '.precision-card',
    '.dash-panel', '.result-stat',
    '.logo-row-label', '.logo-marquee', '.segment-row', '.global-strip',
    '.expense-row', '.value-total', '.audience-card', '.cta-body',
    '.proof-card', '.industries-row', '.faq-item', '.team-card', '.cta-band'
  ];
  document.querySelectorAll(autoSelectors.join(',')).forEach(function (el) {
    el.classList.add('reveal');
  });

  // --- stagger siblings within the same parent ---
  if (!reduced) {
    var groups = new Map();
    document.querySelectorAll('.reveal').forEach(function (el) {
      var p = el.parentElement;
      var i = groups.get(p) || 0;
      el.style.transitionDelay = Math.min(i * 80, 400) + 'ms';
      groups.set(p, i + 1);
    });
  }

  if (reduced || !hasIO) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          el.classList.add('visible');
          io.unobserve(el);
          el.addEventListener('transitionend', function te() {
            el.style.transitionDelay = '';
            el.style.willChange = 'auto';
            el.removeEventListener('transitionend', te);
          });
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  }

  // --- animated counters ---
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    function fmt(n) {
      return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-US');
    }
    if (reduced) {
      el.textContent = prefix + fmt(target) + suffix;
      return;
    }
    var dur = 1400, start = null;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + fmt(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if (reduced || !hasIO) {
    counters.forEach(runCounter);
  } else {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          runCounter(e.target);
          cio.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) {
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      el.textContent = prefix + '0' + suffix;
      cio.observe(el);
    });
  }

  // --- nav CTA solid state, orb pause, mobile bar ---
  var heroActions = document.querySelector('.hero-actions');
  var navCta = document.querySelector('.nav-cta');
  var orbs = document.querySelectorAll('.orb');
  var mobileBar = document.getElementById('mobile-bar');
  var ctaSection = document.getElementById('cta');
  var mobileMq = window.matchMedia('(max-width: 768px)');
  var heroVisible = true;
  var ctaVisible = false;

  function updateMobileBar() {
    if (!mobileBar) return;
    var show = mobileMq.matches && !heroVisible && !ctaVisible;
    if (show) {
      mobileBar.hidden = false;
      document.body.style.paddingBottom = mobileBar.offsetHeight + 'px';
    } else {
      mobileBar.hidden = true;
      document.body.style.paddingBottom = '';
    }
  }

  if (hasIO) {
    if (heroActions) {
      var hio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          heroVisible = e.isIntersecting;
          if (navCta) navCta.classList.toggle('nav-cta--solid', !e.isIntersecting);
          orbs.forEach(function (o) {
            o.style.animationPlayState = e.isIntersecting ? '' : 'paused';
          });
        });
        updateMobileBar();
      });
      hio.observe(heroActions);
    }
    if (ctaSection && mobileBar) {
      var mio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { ctaVisible = e.isIntersecting; });
        updateMobileBar();
      });
      mio.observe(ctaSection);
    }
    if (mobileBar) {
      if (typeof mobileMq.addEventListener === 'function') {
        mobileMq.addEventListener('change', updateMobileBar);
      } else if (typeof mobileMq.addListener === 'function') {
        mobileMq.addListener(updateMobileBar);
      }
      window.addEventListener('resize', updateMobileBar, { passive: true });
      updateMobileBar();
    }
  }

  // --- CTA click tracking (inert unless an analytics script defines window.plausible) ---
  document.addEventListener('click', function (e) {
    var t = e.target;
    var el = t && typeof t.closest === 'function' ? t.closest('[data-cta]') : null;
    if (el) {
      window.plausible && plausible('cta_click', { props: { cta: el.dataset.cta } });
    }
  });

  // --- mobile nav menu: close after a link is chosen ---
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = document.querySelector('.nav-menu');
      if (d) d.removeAttribute('open');
    });
  });

  // --- logo marquee: clone the set for a seamless loop ---
  var track = document.querySelector('.marquee-track');
  if (track && track.children.length === 1) {
    if (reduced) {
      track.classList.add('static');
    } else {
      var clone = track.children[0].cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      track.appendChild(clone);
    }
  }
})();

(function(){var n=document.querySelector('[data-live-count]'),rows=document.querySelectorAll('.meet-row');if(!n||!rows.length)return;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;n.textContent='0';rows.forEach(function(r,i){setTimeout(function(){n.textContent=String(i+1);},300+i*450+250);});})();
