(function () {
  var I = window.GS_I18N || { it: {}, en: {} }, DEMO = window.GS_DEMO || {}, L = window.GS_LABELS || {};
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var lang = store('gs-lang') || ((navigator.language || 'it').slice(0, 2) === 'it' ? 'it' : 'en');

  /* ---------- Language ---------- */
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'it';
    root.lang = lang; root.setAttribute('data-lang', lang); store('gs-lang', lang);
    document.title = lang === 'en' ? 'Garden Studio — Snap your garden. We handle the rest.' : 'Garden Studio — Fotografa il giardino. Al resto pensiamo noi.';
    var d = I[lang];
    document.querySelectorAll('[data-i]').forEach(function (el) { var v = d[el.getAttribute('data-i')]; if (v != null) el.textContent = v; });
    document.querySelectorAll('[data-ip]').forEach(function (el) { var v = d[el.getAttribute('data-ip')]; if (v != null) el.placeholder = v; });
    document.querySelectorAll('[data-lang]').forEach(function (b) { if (b.tagName === 'BUTTON') b.classList.toggle('is-on', b.getAttribute('data-lang') === lang); });
    document.querySelectorAll('.gs-ba').forEach(function (ba) { var i = ba.querySelector('input'); if (i && L[lang]) i.setAttribute('aria-label', L[lang].slider); });
    var ta = document.getElementById('gs-desc');
    if (ta && !ta.dataset.touched && DEMO[lang]) ta.value = DEMO[lang][space].desc;
    if (demoShown) renderDemo();
    if (go) go.textContent = demoShown ? L[lang].again : L[lang].go;
    setShare();
  }
  document.querySelectorAll('.gs-lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });

  /* ---------- Before / after slider ---------- */
  function initBA(ba) {
    var input = ba.querySelector('input');
    function set(v) { ba.style.setProperty('--p', v + '%'); }
    set(input.value);
    input.addEventListener('input', function () { ba.dataset.touched = 1; set(input.value); });
    if (ba.hasAttribute('data-autoplay') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var t0 = null, io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        function step(t) {
          if (ba.dataset.touched) return;
          t0 = t0 || t; var k = Math.min((t - t0) / 2200, 1);
          var v = 80 - 60 * Math.sin(Math.PI * k); input.value = v; set(v);
          if (k < 1) requestAnimationFrame(step);
        }
        setTimeout(function () { requestAnimationFrame(step); }, 600);
        setTimeout(function () { if (!ba.dataset.touched) { input.value = 50; set(50); } }, 3000);
      }, { threshold: .4 });
      io.observe(ba);
    }
  }
  document.querySelectorAll('[data-ba]').forEach(initBA);

  /* ---------- Demo ---------- */
  var space = 'backyard', demoShown = false, busy = false, go = null;
  var demo = document.querySelector('[data-demo]');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderDemo() {
    var d = DEMO[lang][space], lb = L[lang];
    demo.querySelector('[data-demo-slider]').innerHTML =
      '<div class="gs-ba" data-ba><img src="' + d.after + '" alt="' + esc(d.altA) + '" width="1600" height="1000">' +
      '<img class="gs-ba-before" src="' + d.before + '" alt="' + esc(d.altB) + '" width="1600" height="1000">' +
      '<span class="gs-tag gs-tag-l">' + esc(lb.before) + '</span><span class="gs-tag gs-tag-r">' + esc(lb.after) + '</span>' +
      '<input type="range" min="0" max="100" value="50" aria-label="' + esc(lb.slider) + '">' +
      '<div class="gs-ba-line" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg></span></div></div>';
    initBA(demo.querySelector('[data-demo-slider] .gs-ba'));
    demo.querySelector('[data-demo-plants]').innerHTML = d.plants.map(function (p) {
      return '<li><svg class="gs-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><div><b>' + esc(p[0]) + '</b> <span>· ' + esc(p[1]) + '</span></div></li>';
    }).join('');
    demo.querySelector('[data-demo-diy]').textContent = d.diy;
    demo.querySelector('[data-demo-pro]').textContent = d.pro;
  }
  if (demo) {
    go = demo.querySelector('[data-generate]');
    var idle = demo.querySelector('.gs-demo-idle'), done = demo.querySelector('.gs-demo-done'),
      prog = demo.querySelector('.gs-progress'),
      ta = document.getElementById('gs-desc'), beforeImg = demo.querySelector('[data-demo-before]');
    ta.addEventListener('input', function () { ta.dataset.touched = 1; });
    demo.querySelectorAll('.gs-space').forEach(function (b) {
      b.addEventListener('click', function () {
        if (busy) return;
        space = b.getAttribute('data-space');
        demo.querySelectorAll('.gs-space').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        beforeImg.src = DEMO[lang][space].before;
        if (!ta.dataset.touched) ta.value = DEMO[lang][space].desc;
        demoShown = false; done.hidden = true; idle.hidden = false;
        go.textContent = L[lang].go;
      });
    });
    go.addEventListener('click', function () {
      if (busy) return;
      if (demoShown) { demoShown = false; done.hidden = true; idle.hidden = false; go.textContent = L[lang].go; return; }
      busy = true; go.disabled = true; idle.classList.add('is-busy'); prog.hidden = false;
      var items = prog.querySelectorAll('li'), i = 0;
      items.forEach(function (li) { li.classList.remove('is-on'); });
      var iv = setInterval(function () {
        if (i < items.length) { items[i].classList.add('is-on'); i++; return; }
        clearInterval(iv); busy = false; go.disabled = false; idle.classList.remove('is-busy'); prog.hidden = true;
        idle.hidden = true; done.hidden = false; demoShown = true; renderDemo(); go.textContent = L[lang].again;
        if (innerWidth < 960) done.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 650);
    });
  }

  /* ---------- Reveal ---------- */
  var rv = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); rv.unobserve(e.target); } }); }, { threshold: .15 });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { rv.observe(el); });

  /* ---------- Sticky buy bar (mobile) ---------- */
  var sticky = document.querySelector('.gs-sticky'), heroCta = document.getElementById('gs-hero-cta'), wait = document.getElementById('waitlist');
  if (sticky) sticky.inert = true;
  if (sticky && heroCta && wait) {
    var pastHero = false, atEnd = false;
    function upd() { var on = pastHero && !atEnd; sticky.classList.toggle('is-on', on); sticky.setAttribute('aria-hidden', on ? 'false' : 'true'); sticky.inert = !on; }
    new IntersectionObserver(function (es) { pastHero = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; upd(); }).observe(heroCta);
    new IntersectionObserver(function (es) { atEnd = es[0].isIntersecting; upd(); }, { threshold: .05 }).observe(wait);
  }

  /* ---------- FAQ: one open at a time ---------- */
  var faqs = document.querySelectorAll('.gs-faq');
  faqs.forEach(function (f) { f.addEventListener('toggle', function () { if (f.open) faqs.forEach(function (o) { if (o !== f) o.open = false; }); }); });

  /* ---------- Share (after signup) ---------- */
  function setShare() {
    var url = location.origin + '/', msg = (L[lang] && L[lang].share) || 'Garden Studio';
    var wa = document.querySelector('[data-share=wa]'), mail = document.querySelector('[data-share=mail]');
    if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(msg + ' ' + url);
    if (mail) mail.href = 'mailto:?subject=' + encodeURIComponent(L[lang].subject || 'Garden Studio') + '&body=' + encodeURIComponent(msg + ' ' + url);
  }
  var cp = document.querySelector('[data-share=copy]');
  if (cp) cp.addEventListener('click', function () {
    var url = location.origin + '/';
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { cp.textContent = L[lang].copied; }, function () { prompt('', url); });
  });
  if (document.querySelector('.gs-success')) setTimeout(function () { document.getElementById('contact_form').scrollIntoView({ block: 'center' }); }, 50);

  setLang(lang);
})();
