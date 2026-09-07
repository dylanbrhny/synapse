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
  document.querySelectorAll('.nav-menu a').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = a.closest('details');
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

  // --- productivity simulator ---
  var sim = document.getElementById('sim');
  if (sim) {
    var LOADED_X = 1.3;
    var SALARY_MIN = 35000, SALARY_MAX = 150000;
    var NUM_COST_MO = 35;
    var TITAN_COST = 35000;
    var SUPPORT_COST = 18000;
    var MIN_REPS = 1, MAX_REPS = 5;
    var simReps = 1;

    // Penalty budget out of 100. Worst realistic combination (1 number,
    // zero data providers, TitanX off) still lands at a 40% floor, not
    // zero: understaffed reps are still reps, not switched off. Numbers
    // alone can only cost 5 points; data alone up to 25; TitanX is the
    // single biggest lever because it changes who gets called, not just
    // how well the calling is supported.
    var MAX_NUM_PENALTY = 5;
    var MAX_DATA_PENALTY = 25;
    var TITAN_PENALTY = 30;

    var sSalary = document.getElementById('sim-salary');
    var sNum = document.getElementById('sim-numbers');
    var sTitan = document.getElementById('sim-titan');
    var sSupport = document.getElementById('sim-support');
    var provEls = Array.prototype.slice.call(document.querySelectorAll('#sim-providers .sim-provider'));

    function simClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function money(v) { return '$' + Math.round(v).toLocaleString('en-US'); }

    function currentSalary() {
      var v = parseInt(sSalary.value, 10);
      if (!v || isNaN(v)) return 55000;
      return simClamp(v, SALARY_MIN, SALARY_MAX);
    }

    // Numbers penalty: mild across the whole range, a bit steeper as you
    // approach 1, but capped at MAX_NUM_PENALTY however low you go.
    function numbersPenalty(n) {
      var deficit = simClamp(20 - n, 0, 19);
      return MAX_NUM_PENALTY * Math.pow(deficit / 19, 1.3);
    }

    // Data penalty: losing one provider barely registers; losing most of
    // them compounds toward the cap, but never past it.
    function dataPenalty(missingFrac) {
      return MAX_DATA_PENALTY * Math.pow(simClamp(missingFrac, 0, 1), 1.5);
    }

    function simCompute() {
      var salary = currentSalary();
      var repCost = Math.round(salary * LOADED_X);
      var n = parseInt(sNum.value, 10);
      var titan = sTitan.getAttribute('aria-checked') === 'true';
      var support = sSupport.getAttribute('aria-checked') === 'true';

      // data coverage + per-seat cost from individually selected providers
      var dataWeight = 0, dataCost = 0, dataOn = 0;
      var dataNames = [];
      provEls.forEach(function (el) {
        if (el.getAttribute('aria-pressed') === 'true') {
          dataWeight += parseFloat(el.getAttribute('data-weight'));
          dataCost += parseFloat(el.getAttribute('data-cost'));
          dataOn++;
          dataNames.push(el.querySelector('.sp-name').textContent);
        }
      });
      dataWeight = simClamp(dataWeight, 0, 1);

      var pNum = numbersPenalty(n);
      var pData = dataPenalty(1 - dataWeight);
      var pTitan = titan ? 0 : TITAN_PENALTY;

      var prodPct = simClamp(Math.round(100 - pNum - pData - pTitan), 40, 100);
      var p = prodPct / 100;
      var convos = Math.max(1, Math.round(12 * p));

      // costs: data and number-screening license per seat, like the real vendors
      var numbersPerRep = n * NUM_COST_MO * 12;
      var numbersCost = numbersPerRep * simReps;
      var repsCost = repCost * simReps;
      var total = repsCost + numbersCost + dataCost * simReps + (titan ? TITAN_COST * simReps : 0) + (support ? SUPPORT_COST : 0);
      var annualConvos = convos * 250 * simReps;
      var cpc = total / annualConvos;

      // outputs
      document.getElementById('sim-reps-val').textContent = simReps;
      document.getElementById('sim-reps-note').textContent = 'Loaded at 1.3 times for payroll tax, benefits, and management: about ' + money(repCost) + '/yr' + (simReps > 1 ? ' each, ' + money(repsCost) + ' total.' : ' each.');
      document.getElementById('sim-numbers-val').textContent = (n >= 25 ? '25+' : n) + ' · ' + money(numbersPerRep) + '/yr per rep';
      document.getElementById('sim-data-val').textContent = dataOn + ' of 6 · ' + money(dataCost) + '/yr per seat';
      document.getElementById('sim-prod').textContent = prodPct + '%';
      document.getElementById('sim-convos').textContent = convos;
      document.getElementById('sim-annual').textContent = annualConvos.toLocaleString();
      document.getElementById('sim-cost').textContent = money(total);
      document.getElementById('sim-cpc').textContent = money(cpc);

      var color = prodPct >= 90 ? '#34d399' : prodPct >= 75 ? '#4a9eff' : prodPct >= 55 ? '#fb923c' : '#f87171';
      var fill = document.getElementById('sim-meter-fill');
      fill.style.width = prodPct + '%';
      fill.style.backgroundColor = color;
      document.getElementById('sim-prod').style.color = color;

      // stepper limits (aria-disabled keeps the buttons focusable)
      sim.querySelectorAll('.sim-stepper button').forEach(function (b) {
        var step = parseInt(b.getAttribute('data-step'), 10);
        var off = (step < 0 && simReps <= MIN_REPS) || (step > 0 && simReps >= MAX_REPS);
        b.setAttribute('aria-disabled', String(off));
      });

      // contextual notes
      document.getElementById('sim-numbers-note').textContent = n < 8
        ? 'Below 8, you are relying on very few lines. Carriers can flag heavy single-line volume, so treat this range as a real caution zone even though the dip here looks modest.'
        : 'Real non-VoIP lines run $25 to 50 per month each. Anywhere from 8 to 25 keeps you safely under carrier volume filters.';

      var missingCount = 6 - dataOn;
      document.getElementById('sim-data-note').textContent = missingCount <= 1
        ? 'Average annual contracts. Missing one provider barely moves coverage.'
        : 'Average annual contracts. Missing ' + missingCount + ' providers leaves overlapping holes: wrong numbers, dead records, missed contacts.';

      document.getElementById('sim-titan-note').textContent = titan
        ? 'On: dead and disconnected numbers are filtered out before a rep ever dials them.'
        : 'Off saves ' + money(TITAN_COST * simReps) + ', but reps spend real hours dialing numbers that were never going to connect in the first place.';

      var msg = document.getElementById('sim-msg');
      var m, mColor;
      if (!titan) {
        m = 'Cutting TitanX means reps burn hours on numbers that were never going to connect. You are still paying the reps either way, so every conversation now costs ' + money(cpc) + '.';
        mColor = '#fb923c';
      } else if (missingCount >= 4) {
        m = 'Missing this many providers, the gaps overlap. Reps spend more of the day chasing records that were never reachable, at ' + money(cpc) + ' per conversation.';
        mColor = '#fb923c';
      } else if (missingCount >= 2) {
        m = 'A couple of missing providers compounds faster than it looks. Coverage has real holes now, and cost per conversation is drifting up toward ' + money(cpc) + '.';
        mColor = '#4a9eff';
      } else if (prodPct >= 95) {
        m = support
          ? 'Fully tuned and managed. This is the stack we run for every client, at what it costs to assemble and run yourself.'
          : 'Fully tuned. This is the stack we run for every client, at what it costs to assemble yourself, before anyone manages it.';
        mColor = '#4a9eff';
      } else if (total < 125000 * simReps) {
        m = 'Cheaper on paper, worse per conversation. At ' + money(cpc) + ' per ICP conversation, some of what you saved on the stack comes back as rep hours spent on dead ends.';
        mColor = '#fb923c';
      } else {
        m = 'Working, but there is headroom. Add the missing layer and cost per conversation drops as output climbs.';
        mColor = '#4a9eff';
      }
      msg.textContent = m;
      msg.style.borderLeftColor = mColor;

      // --- transparent math breakdown ---
      var mathEl = document.getElementById('sim-math');
      if (mathEl) {
        var repLine = simReps > 1
          ? money(salary) + ' salary × 1.3 loaded = <b>' + money(repCost) + '</b>/yr each × ' + simReps + ' reps = <b>' + money(repsCost) + '</b>'
          : money(salary) + ' salary × 1.3 loaded = <b>' + money(repCost) + '</b>/yr';
        var dataLine = dataOn > 0
          ? dataOn + ' of 6 providers (' + dataNames.join(', ') + ') = <b>' + money(dataCost) + '</b>/yr per seat'
          : 'no data providers selected = <b>$0</b>/yr';
        var costLines = [];
        costLines.push(repLine);
        costLines.push('+ ' + n + ' numbers × $' + NUM_COST_MO + '/mo × 12 × ' + simReps + ' rep' + (simReps > 1 ? 's' : '') + ' = <b>' + money(numbersCost) + '</b>');
        costLines.push('+ ' + dataLine);
        costLines.push('+ TitanX number screening: ' + (titan ? '<b>' + money(TITAN_COST * simReps) + '</b>' : '<b>$0</b> (off)'));
        costLines.push('+ part-time account follow-up (in-house): ' + (support ? '<b>' + money(SUPPORT_COST) + '</b>' : '<b>$0</b> (off)'));
        costLines.push('= <span class="g"><b>' + money(total) + '</b></span> total, per year');

        var prodLine = '100 − ' + pNum.toFixed(1) + ' (numbers) − ' + pData.toFixed(1) + ' (data) − ' + pTitan + ' (TitanX) = <b>' + prodPct + '%</b> productivity';
        var convoLine = prodPct + '% × 12 max/day = <b>' + convos + '</b> conversations/day × 250 days × ' + simReps + ' rep' + (simReps > 1 ? 's' : '') + ' = <b>' + annualConvos.toLocaleString() + '</b>/yr';
        var cpcLine = money(total) + ' ÷ ' + annualConvos.toLocaleString() + ' = <span class="g"><b>' + money(cpc) + '</b> per ICP conversation</span>';

        mathEl.innerHTML = costLines.join('<br>') + '<br><br>' + prodLine + '<br>' + convoLine + '<br>' + cpcLine;
      }
    }

    sSalary.addEventListener('input', simCompute);

    sim.querySelectorAll('.sim-stepper button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        simReps = simClamp(simReps + parseInt(b.getAttribute('data-step'), 10), MIN_REPS, MAX_REPS);
        simCompute();
      });
    });

    sNum.addEventListener('input', simCompute);

    provEls.forEach(function (el) {
      el.addEventListener('click', function () {
        el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        simCompute();
      });
    });

    // native switch buttons: click covers Space/Enter; the row is a big hit area
    function simBindSwitch(btn) {
      btn.addEventListener('click', function () {
        btn.setAttribute('aria-checked', btn.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
        simCompute();
      });
      var row = btn.closest('.sim-toggle-row');
      if (row) {
        row.addEventListener('click', function (e) {
          if (e.target.closest('.sim-switch')) return;
          btn.click();
        });
      }
    }
    simBindSwitch(sTitan);
    simBindSwitch(sSupport);

    simCompute();
  }
  /* === END SIMULATOR BLOCK === */
})();
