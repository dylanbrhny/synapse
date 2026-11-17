// Qualifying quiz for synapsemfg.com. Every link to the 30-minute Cal.com event opens it;
// the calendar only shows once they qualify. Someone who is not the sole decision maker must
// add the other decision maker's email, and that person is added to the invite as a guest.
// The links keep their cal.com href, so the calendar still works without JavaScript.
(function () {
  var CAL_LINK = 'synapsemfg/30min';
  var LINK_SEL = 'a[href*="cal.com/' + CAL_LINK + '"]';
  var PAGE = location.pathname;

  function track(name, params) { if (window.gtag) gtag('event', name, Object.assign({ page: 'site', path: PAGE }, params || {})); }

  // o: [label, result] where result is 1 = next question, 0 = disqualify, 'cal' = straight to the calendar
  var Q = [
    { k: 'Company', q: 'What best describes your company?', o: [['We manufacture our own products', 1], ['We distribute industrial products', 1], ['We serve manufacturers or plants (services, contracting, engineering)', 1], ['Something else (software, agency, consulting, retail)', 0]] },
    { k: 'Sells to', q: 'Who are your best customers?', o: [['Manufacturers', 1], ['Government, cities and municipalities', 1], ['Distributors', 1], ['Other', 1]] },
    { k: 'Customer value', q: 'What is a new customer worth to you over their lifetime?', o: [['Under $25,000', 1], ['$25,000 to $75,000', 1], ['$75,000 to $150,000', 1], ['$150,000+', 1]] },
    { k: 'Close rate', q: 'Out of 10 qualified first meetings, how many become customers?', o: [['1 or fewer', 1], ['2 to 3', 1], ['4 to 5', 1], ['More than 5', 1], ['Not sure yet', 1]] },
    { k: 'Role', q: 'What is your role?', o: [['Owner or founder', 1], ['President or CEO', 1], ['Sales or marketing leader', 1], ['Something else', 1]] },
    { k: 'Commit', q: 'If this is a fit, how soon can you commit?', o: [['On the call', 1], ['This week', 1], ['Within 30 days', 1], ['31+ days', 0]] },
    { k: 'Final decision maker', q: 'Are you the sole decision maker?', o: [['Yes', 'cal'], ['No, someone else signs off too', 1]] },
    { k: 'Decision maker email', dm: true, q: 'Add the other decision maker to the invite.' }
  ];
  var DQ = {
    'Company': 'We only work with manufacturers and the industrial companies that sell to them. Every script, list and salesperson we build is for that world, so we would not be the right fit for you.',
    'Commit': 'Sounds like the timing isn\'t right yet. Our onboarding spots go to companies ready to start within 30 days. Come back when you are, and we\'ll pick it up from there.'
  };
  var TOTAL = Q.length - 1; // the decision maker email step only shows when they answer No to "sole decision maker"
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var CSS =
    '.sq-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(3,6,14,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font-family:Inter,system-ui,-apple-system,sans-serif;color:#e8e6e3;line-height:1.5;text-align:left}' +
    '.sq-modal.sq-open{display:flex}' +
    'body.sq-locked{overflow:hidden}' +
    '.sq-modal *{box-sizing:border-box}' +
    '.sq-box{position:relative;width:100%;max-width:560px;max-height:calc(100vh - 48px);overflow:auto;background:linear-gradient(180deg,#16161a,#111114);border:1px solid #2a2a32;border-radius:20px;padding:30px 30px 26px;box-shadow:0 40px 120px -20px rgba(0,0,0,.8),0 0 0 1px rgba(74,158,255,.12);animation:sq-pop .25s cubic-bezier(.2,.8,.2,1)}' +
    '.sq-box.sq-wide{max-width:1060px}' +
    '@keyframes sq-pop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.sq-box{animation:none}.sq-prog i{transition:none}}' +
    '.sq-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:10px;border:1px solid #2a2a32;background:transparent;color:#a8a8b4;font-size:22px;line-height:1;cursor:pointer}' +
    '.sq-x:hover{color:#fff;border-color:#6a6a76}' +
    '.sq-prog{height:4px;background:rgba(255,255,255,.08);border-radius:4px;margin:6px 50px 22px 0;overflow:hidden}' +
    '.sq-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,#2f7fe0,#4a9eff);transition:width .35s}' +
    '.sq-step{font-size:12px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#86869a;margin-bottom:8px}' +
    '.sq-box h3{font-family:"Cal Sans",Inter,sans-serif;font-weight:400;font-size:26px;line-height:1.2;margin:0 0 20px;padding-right:40px;color:#fff}' +
    '.sq-opts{display:grid;gap:10px}' +
    '.sq-opts.sq-yn{grid-template-columns:1fr 1fr}' +
    '.sq-opt{display:flex;align-items:center;gap:12px;text-align:left;width:100%;padding:15px 18px;border-radius:12px;border:1px solid #2a2a32;background:rgba(10,10,12,.6);color:#e8e6e3;font:inherit;font-size:16px;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}' +
    '.sq-opt:hover,.sq-opt.sq-sel{border-color:rgba(74,158,255,.5);background:rgba(74,158,255,.1)}' +
    '.sq-opt:active{transform:scale(.99)}' +
    '.sq-opt b{display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:7px;border:1px solid #6a6a76;font-size:12px;font-weight:600;color:#a8a8b4}' +
    '.sq-back{margin-top:16px;background:none;border:0;color:#86869a;font:inherit;font-size:14px;cursor:pointer;padding:4px 0}' +
    '.sq-back:hover{color:#e8e6e3}' +
    '.sq-msg p,.sq-sub{color:#a8a8b4;margin:0 0 22px;font-size:15px}' +
    '.sq-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 24px;border-radius:12px;border:0;background:#4a9eff;color:#04101f;font:inherit;font-size:16px;font-weight:600;text-decoration:none;cursor:pointer}' +
    '.sq-btn:hover{background:#6cb1ff}' +
    '.sq-ok{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#34d399;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);padding:5px 11px;border-radius:999px;margin-bottom:12px}' +
    '.sq-cvsub{color:#a8a8b4;margin:-10px 0 16px;font-size:15px}' +
    '#sq-cal{width:100%;min-height:600px;overflow:auto;color-scheme:dark;border-radius:12px}' +
    '.sq-load{display:grid;place-items:center;min-height:300px;color:#86869a;font-size:14px}' +
    '.sq-row{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-bottom:10px}' +
    '.sq-row input{width:100%;padding:14px 16px;border-radius:12px;border:1px solid #2a2a32;background:rgba(10,10,12,.6);color:#e8e6e3;font:inherit;font-size:16px}' +
    '.sq-row input:focus{outline:none;border-color:rgba(74,158,255,.6);background:rgba(74,158,255,.08)}' +
    '.sq-row input[aria-invalid="true"]{border-color:#ef4444}' +
    '.sq-err{color:#f87171;font-size:14px;margin:4px 0 10px;min-height:1em}' +
    '.sq-add{background:none;border:0;color:#4a9eff;font:inherit;font-size:14px;cursor:pointer;padding:2px 0;margin-bottom:16px}' +
    '.sq-actions{display:flex;flex-wrap:wrap;align-items:center;gap:16px}' +
    '.sq-skip{background:none;border:0;color:#86869a;font:inherit;font-size:14px;cursor:pointer;padding:4px 0;text-decoration:underline}' +
    '.sq-modal :focus-visible{outline:2px solid #4a9eff;outline-offset:2px}' +
    '@media (max-width:560px){.sq-modal{padding:12px}.sq-box{padding:24px 18px 20px}.sq-row{grid-template-columns:1fr}.sq-opts.sq-yn{grid-template-columns:1fr}.sq-box h3{font-size:22px}}';

  var m, box, qv, cv;
  var step = 0, ans = [], qualified = false, calLoaded = false, lastFocus = null, started = false, dms = [], skipped = false;

  function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    m = document.createElement('div');
    m.className = 'sq-modal'; m.id = 'sq-modal';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'sq-h');
    m.innerHTML =
      '<div class="sq-box" id="sq-box"><button class="sq-x" id="sq-x" type="button" aria-label="Close">&times;</button>' +
      '<div id="sq-qv"></div>' +
      '<div id="sq-cv" hidden><span class="sq-ok">&#10003; You qualify</span>' +
      '<h3 id="sq-cvh">Pick a time with Grant.</h3>' +
      '<p class="sq-cvsub" id="sq-cvsub">30 minutes. Your price, from your numbers, on the call.</p>' +
      '<div id="sq-cal"><div class="sq-load">Loading the calendar...</div></div></div></div>';
    document.body.appendChild(m);
    box = document.getElementById('sq-box'); qv = document.getElementById('sq-qv'); cv = document.getElementById('sq-cv');

    qv.addEventListener('click', function (e) {
      var o = e.target.closest('.sq-opt'); if (o) return pick(+o.getAttribute('data-i'));
      if (e.target.closest('.sq-add')) { dms = readDm(); dms.push({}); renderDm(Math.min(step + 1, TOTAL)); var r = qv.querySelectorAll('input[name="dmname"]'); r[r.length - 1].focus(); return; }
      // .sq-skipok also carries .sq-skip for its look, so it has to be checked first.
      if (e.target.closest('.sq-skipok')) {
        dms = []; skipped = true; ans[step] = 'Not added'; ans.length = step + 1;
        track('quiz_answer', { question: Q[step].k, answer: 'skipped' }); track('quiz_dm_skipped');
        qualified = true; track('quiz_qualified', { final_decision_maker: false, dm_added: false });
        return showCal();
      }
      if (e.target.closest('.sq-skip')) { dms = readDm(); track('quiz_dm_skip_warning'); return skipWarn(); }
      if (e.target.closest('.sq-readd')) { track('quiz_dm_skip_reconsidered'); return renderDm(Math.min(step + 1, TOTAL)); }
      if (e.target.closest('.sq-back')) {
        var inMsg = !!qv.querySelector('.sq-msg');
        if (!inMsg) { if (Q[step].dm) dms = readDm(); step = Math.max(0, step - 1); }
        render();
      }
    });
    qv.addEventListener('submit', function (e) { e.preventDefault(); submitDm(); });
    document.getElementById('sq-x').addEventListener('click', close);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', function (e) {
      if (!m.classList.contains('sq-open')) return;
      if (e.key === 'Escape') return close();
      if (e.key === 'Tab') return trapTab(e);
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key.toUpperCase();
      if (k === 'Y') k = 'A'; else if (k === 'N') k = 'B';
      if (!qv.hidden && /^[A-E1-5]$/.test(k)) { var i = /\d/.test(k) ? k - 1 : k.charCodeAt(0) - 65, b = qv.querySelector('.sq-opt[data-i="' + i + '"]'); if (b) b.click(); }
    });
  }

  function trapTab(e) {
    var f = Array.prototype.filter.call(box.querySelectorAll('button,a[href],input,iframe,[tabindex]:not([tabindex="-1"])'), function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(src) {
    if (!m) build();
    lastFocus = document.activeElement;
    m.classList.add('sq-open'); document.body.classList.add('sq-locked');
    if (!started) { started = true; track('quiz_start', { cta: src }); }
    qualified ? showCal() : render();
  }
  function close() { m.classList.remove('sq-open'); document.body.classList.remove('sq-locked'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  function head(n, q) {
    return '<div class="sq-prog"><i style="width:' + ((n - 1) / TOTAL * 100) + '%"></i></div>' +
      '<div class="sq-step">Question ' + n + ' of ' + TOTAL + '</div><h3 id="sq-h">' + q + '</h3>';
  }
  function grow(n) { requestAnimationFrame(function () { var p = qv.querySelector('.sq-prog i'); if (p) p.style.width = (n / TOTAL * 100) + '%'; }); }

  function render() {
    box.classList.remove('sq-wide'); cv.hidden = true; qv.hidden = false;
    var s = Q[step], n = Math.min(step + 1, TOTAL);
    if (s.dm) return renderDm(n);
    var h = head(n, s.q) + '<div class="sq-opts' + (s.o.length === 2 ? ' sq-yn' : '') + '">';
    s.o.forEach(function (o, i) { h += '<button type="button" class="sq-opt' + (ans[step] === o[0] ? ' sq-sel' : '') + '" data-i="' + i + '"><b>' + String.fromCharCode(65 + i) + '</b>' + o[0] + '</button>'; });
    h += '</div>' + (step ? '<button type="button" class="sq-back">&larr; Back</button>' : '');
    qv.innerHTML = h; grow(n);
    qv.querySelector('.sq-opt').focus();
  }

  // Not the sole decision maker: the calendar only opens once the other decision maker's email is in.
  function dmRow(d, i) {
    return '<div class="sq-row"><input type="text" name="dmname" autocomplete="off" placeholder="Their name" aria-label="Decision maker ' + (i + 1) + ' name" value="' + esc(d.name || '') + '">' +
      '<input type="email" name="dmemail" autocomplete="off" inputmode="email" placeholder="their@company.com" aria-label="Decision maker ' + (i + 1) + ' work email' + (i ? '' : ' (required)') + '"' + (i ? '' : ' required') + ' value="' + esc(d.email || '') + '"></div>';
  }
  function renderDm(n) {
    var rows = dms.length ? dms : [{}];
    qv.innerHTML = head(n, Q[step].q) +
      '<p class="sq-sub">This call is where we set your price, so it goes far faster with everyone who signs off on it. They\'ll get the calendar invite with you.</p>' +
      '<form class="sq-form" novalidate><div>' + rows.map(dmRow).join('') + '</div>' +
      '<div class="sq-err" role="alert"></div>' +
      (rows.length < 3 ? '<button type="button" class="sq-add">+ Add another decision maker</button>' : '') +
      '<div class="sq-actions"><button type="submit" class="sq-btn">Add to invite &amp; pick a time</button>' +
      '<button type="button" class="sq-skip">Book without them</button></div></form>' +
      '<button type="button" class="sq-back">&larr; Back</button>';
    grow(n);
    var first = qv.querySelector('input[name="dmemail"]');
    (first.value ? qv.querySelector('.sq-btn') : qv.querySelector('input[name="dmname"]')).focus();
  }
  // They chose to book without the other decision maker: one last, strong nudge before the calendar.
  function skipWarn() {
    qv.innerHTML = '<div class="sq-msg"><h3 id="sq-h">Book without them?</h3>' +
      '<p>Grant sets your price and decides next steps with you on this call. Without everyone who signs off, it almost always turns into a second call to walk them through it. Adding their email takes 10 seconds.</p>' +
      '<div class="sq-actions"><button type="button" class="sq-btn sq-readd">Add them to the invite</button>' +
      '<button type="button" class="sq-skip sq-skipok">Book without them anyway</button></div></div>';
    qv.querySelector('.sq-readd').focus();
  }
  function readDm() {
    var names = qv.querySelectorAll('input[name="dmname"]'), out = [];
    qv.querySelectorAll('input[name="dmemail"]').forEach(function (e, i) { out.push({ name: names[i].value.trim(), email: e.value.trim() }); });
    return out;
  }
  function submitDm() {
    var rows = readDm(), err = qv.querySelector('.sq-err'), bad = null;
    qv.querySelectorAll('input[name="dmemail"]').forEach(function (e, i) {
      var v = rows[i].email, ok = i ? (!v || EMAIL.test(v)) : EMAIL.test(v);
      e.setAttribute('aria-invalid', ok ? 'false' : 'true'); if (!ok && !bad) bad = e;
    });
    if (bad) { err.textContent = rows[0].email ? 'Check the email address.' : 'Add their email, or choose Book without them.'; bad.focus(); return; }
    dms = rows.filter(function (d) { return d.email; });
    ans[step] = dms.length + ' added'; ans.length = step + 1;
    track('quiz_answer', { question: Q[step].k, answer: 'added' });
    track('quiz_dm_added', { count: dms.length });
    skipped = false; qualified = true; track('quiz_qualified', { final_decision_maker: false, dm_added: true });
    showCal();
  }

  function pick(i) {
    var s = Q[step], o = s.o[i];
    ans[step] = o[0]; ans.length = step + 1;
    track('quiz_answer', { question: s.k, answer: o[0] });
    if (o[1] === 0) return dq(s.k);
    if (o[1] === 'cal') { qualified = true; track('quiz_qualified', { final_decision_maker: s.k === 'Final decision maker' }); return showCal(); }
    step++; render();
  }

  function dq(k) {
    track('quiz_disqualified', { reason: k });
    qv.innerHTML = '<div class="sq-msg"><h3 id="sq-h">Thanks for your honesty.</h3><p>' + DQ[k] + '</p>' +
      '<button type="button" class="sq-btn" id="sq-done">Back to the site</button><br><button type="button" class="sq-back">&larr; Change my answer</button></div>';
    document.getElementById('sq-done').addEventListener('click', close);
    document.getElementById('sq-done').focus();
  }

  function notes() {
    var n = 'Answers from synapsemfg.com' + PAGE + '\n' + Q.map(function (s, i) { return ans[i] && !s.dm ? s.k + ': ' + ans[i] : null; }).filter(Boolean).join('\n');
    if (dms.length) n += '\nOther decision makers (added as guests): ' + dms.map(function (d) { return (d.name ? d.name + ' ' : '') + '<' + d.email + '>'; }).join(', ');
    else if (skipped) n += '\nOther decision maker: NOT added (booked without them after the warning)';
    return n;
  }

  function showCal() {
    qv.hidden = true; cv.hidden = false; box.classList.add('sq-wide');
    document.getElementById('sq-x').focus();
    if (dms.length) {
      document.getElementById('sq-cvh').textContent = 'Pick a time that works for both of you.';
      document.getElementById('sq-cvsub').textContent = dms.map(function (d) { return d.name || d.email; }).join(' and ') + ' will get the invite with you. Keep them on the guest list when you book.';
    } else if (skipped) {
      document.getElementById('sq-cvh').textContent = 'Pick a time with Grant.';
      document.getElementById('sq-cvsub').textContent = 'Can the other decision maker make it after all? Add their email under "Add guests" when you book.';
    }
    if (calLoaded) return; calLoaded = true;
    (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal, ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var ns = ar[1]; api.q = api.q || []; if (typeof ns === 'string') { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ['initNamespace', ns]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    document.getElementById('sq-cal').innerHTML = '';
    Cal('init', 'site30', { origin: 'https://app.cal.com' });
    var config = { layout: 'month_view', theme: 'dark', 'ui.color-scheme': 'dark', notes: notes() };
    if (dms.length) config.guests = dms.map(function (d) { return d.email; });
    Cal.ns.site30('inline', { elementOrSelector: '#sq-cal', calLink: CAL_LINK, config: config });
    Cal.ns.site30('ui', { cssVarsPerTheme: { dark: { 'cal-brand': '#4a9eff' } }, hideEventTypeDetails: false, colorScheme: 'dark', layout: 'month_view' });
    Cal.ns.site30('on', { action: 'bookingSuccessful', callback: function () { track('booking_made'); } });
  }

  function init() {
    // The links now open this dialog, not a new tab: drop the "(opens in a new tab)" screen reader note.
    document.querySelectorAll(LINK_SEL).forEach(function (a) {
      a.querySelectorAll('.sr-only').forEach(function (s) { if (/new tab/i.test(s.textContent)) s.remove(); });
      a.setAttribute('aria-haspopup', 'dialog');
    });
    // Capture phase so every booking link, including ones added later, goes through the quiz first.
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest(LINK_SEL) : null;
      if (!a) return;
      e.preventDefault();
      open(a.getAttribute('data-cta') || 'link');
    }, true);
    // /book/ redirects to /#book, which opens the quiz on arrival.
    if (location.hash === '#book') open('book-link');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
