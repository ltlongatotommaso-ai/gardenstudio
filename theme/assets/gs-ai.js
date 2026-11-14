(function () {
  var root = document.querySelector('[data-ai]');
  if (!root) return;
  var URL_AI = window.GS_AI_URL, S = window.GS_AI || {}, L = window.GS_LABELS || {};
  function lang() { return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'it'; }
  function t(k) { return (S[lang()] || {})[k] || ''; }
  function $(s, el) { return (el || root).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function eur(n) { n = Math.round(Number(n) || 0); return lang() === 'en' ? '€' + n.toLocaleString('en-GB') : n.toLocaleString('it-IT') + ' €'; }

  /* ---------- Tabs ---------- */
  var tabs = document.querySelectorAll('.gs-tabs [data-tab]');
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); });
      document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== b.getAttribute('data-tab'); });
    });
  });

  /* ---------- Inputs ---------- */
  var form = $('.gs-ai-form'), file = $('[data-file]'), prev = $('[data-prev]'), drop = $('[data-drop]'),
    desc = $('#gs-ai-desc'), email = $('#gs-ai-email'), consent = $('[data-consent]'), err = $('[data-err]'), go = $('[data-go]'),
    idle = $('[data-idle]'), busy = $('[data-busy]'), res = $('[data-res]');
  var photo = null, space = 'garden', sending = false;
  try { var saved = localStorage.getItem('gs-ai-email'); if (saved) email.value = saved; } catch (e) {}

  root.querySelectorAll('[data-sp]').forEach(function (b) {
    b.addEventListener('click', function () {
      space = b.getAttribute('data-sp');
      root.querySelectorAll('[data-sp]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });
  });
  root.querySelectorAll('[data-chip]').forEach(function (b) {
    b.addEventListener('click', function () {
      var txt = (t('chips') || [])[+b.getAttribute('data-chip')]; if (!txt) return;
      var v = desc.value.trim();
      if (v.toLowerCase().indexOf(txt.toLowerCase()) === -1) desc.value = (v ? v.replace(/[.,;\s]+$/, '') + ', ' : '') + txt.toLowerCase();
      b.classList.add('is-on'); desc.focus();
    });
  });

  function showErr(msg) { err.textContent = msg; err.hidden = !msg; if (msg) err.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

  /* Resize in the browser: max 1280 px JPEG, keeps uploads small and fast */
  function loadPhoto(f) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var max = 1280, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var q = 0.86, data = c.toDataURL('image/jpeg', q);
        while (data.length > 1.9e6 && q > 0.5) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
        resolve(data);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('file')); };
      img.src = url;
    });
  }
  function setFile(f) {
    if (!f) return;
    showErr('');
    loadPhoto(f).then(function (data) {
      photo = data; prev.src = data;
      $('.gs-drop-empty').hidden = true; $('.gs-drop-prev').hidden = false; drop.classList.add('has-photo');
      $('[data-busy-img]').src = data;
    }, function () { showErr(t('e_file')); });
  }
  file.addEventListener('change', function () { setFile(file.files && file.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-drag'); }); });
  drop.addEventListener('drop', function (e) { setFile(e.dataTransfer.files && e.dataTransfer.files[0]); });

  /* ---------- Progress ---------- */
  var timer = null;
  function startProgress() {
    var items = busy.querySelectorAll('.gs-progress li'), i = 0;
    items.forEach(function (li) { li.classList.remove('is-on'); });
    items[0].classList.add('is-on');
    timer = setInterval(function () { if (i < items.length - 1) { i++; items[i].classList.add('is-on'); } }, 7000);
  }
  function stopProgress() { clearInterval(timer); }
  function view(which) {
    idle.hidden = which !== 'idle'; busy.hidden = which !== 'busy'; res.hidden = which !== 'res';
  }

  /* ---------- Result ---------- */
  var last = null;
  function renderResult(d) {
    last = d;
    var lb = L[lang()] || {};
    $('[data-res-slider]').innerHTML =
      '<div class="gs-ba" data-ba><img src="' + d.image + '" alt="" width="1600" height="1000">' +
      '<img class="gs-ba-before" src="' + photo + '" alt="" width="1600" height="1000">' +
      '<span class="gs-tag gs-tag-l">' + esc(lb.before || '') + '</span><span class="gs-tag gs-tag-r">' + esc(lb.after || '') + '</span>' +
      '<input type="range" min="0" max="100" value="50" aria-label="' + esc(lb.slider || '') + '">' +
      '<div class="gs-ba-line" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg></span></div></div>';
    var ba = $('[data-res-slider] .gs-ba'), input = ba.querySelector('input');
    function set(v) { ba.style.setProperty('--p', v + '%'); } set(50);
    input.addEventListener('input', function () { set(input.value); });
    var p = d.plan || {};
    $('.gs-res-grid').hidden = !d.plan; $('.gs-res-head').hidden = !d.plan;
    $('[data-r-title]').textContent = p.title || '';
    $('[data-r-sum]').textContent = p.summary || '';
    $('[data-r-plants]').innerHTML = (p.plants || []).map(function (x) {
      return '<li><svg class="gs-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><div><b>' + esc(x.name) + (x.qty ? ' × ' + esc(x.qty) : '') + '</b><span>' + esc(x.why || '') + '</span></div></li>';
    }).join('');
    $('[data-r-mats]').innerHTML = (p.materials || []).map(function (x) {
      return '<li><span>' + esc(x.item) + ' <small>· ' + esc(x.qty) + '</small></span><b>' + eur(x.price_eur) + '</b></li>';
    }).join('');
    $('[data-r-diy]').textContent = eur(p.budget_diy_eur);
    $('[data-r-pro]').textContent = eur(p.budget_pro_eur);
    $('[data-r-care]').innerHTML = (p.care || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var dl = $('[data-dl]'); dl.href = d.image;
    var left = typeof d.remaining === 'number' ? d.remaining : null;
    $('[data-left]').textContent = left === null ? '' : t('left').replace('{n}', left);
    $('[data-again]').hidden = left === 0;
  }

  $('[data-again]').addEventListener('click', function () { view('idle'); desc.focus(); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  /* ---------- Submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    var em = email.value.trim(), ds = desc.value.trim();
    if (!photo) return showErr(t('e_noimg'));
    if (ds.length < 3) return showErr(t('e_desc'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return showErr(t('e_email'));
    if (!consent.checked) return showErr(t('e_consent'));
    showErr('');
    try { localStorage.setItem('gs-ai-email', em); } catch (x) {}
    sending = true; go.disabled = true; view('busy'); startProgress();
    if (innerWidth < 960) busy.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var ctrl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 90000);
    fetch(URL_AI, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({ image: photo, description: ds, space: space, lang: lang(), email: em.toLowerCase(), consent: true })
    }).then(function (r) {
      return r.json().catch(function () { return { error: 'ai_failed' }; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (o) {
      if (!o.ok || !o.j.image) throw new Error(o.j.error || 'ai_failed');
      renderResult(o.j); view('res');
      if (window.Shopify && Shopify.analytics && Shopify.analytics.publish) { try { Shopify.analytics.publish('gs_ai_render', { space: space }); } catch (x) {} }
      res.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function (x) {
      var code = x && x.name === 'AbortError' ? 'net' : (x && x.message) || 'net';
      if (code === 'Failed to fetch' || code === 'Load failed' || code === 'NetworkError when attempting to fetch resource.') code = 'net';
      view(last ? 'res' : 'idle'); showErr(t(code) || t('ai_failed'));
    }).then(function () { clearTimeout(to); stopProgress(); sending = false; go.disabled = false; });
  });
})();
