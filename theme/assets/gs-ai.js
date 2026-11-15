(function () {
  var S = window.GS_AI || {}, ST = window.GS_STUDIO || {};
  var RESULT_URL = '/pages/il-tuo-progetto';
  function lang() { return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'it'; }
  function t(k) { return (S[lang()] || {})[k] || ''; }
  function L() { return ST[lang()] || ST.it || {}; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Landing: tabs, and the "already used" card instead of the studio launcher ---------- */
  var tabs = document.querySelectorAll('.gs-tabs [data-tab]');
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); });
      document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== b.getAttribute('data-tab'); });
    });
  });
  var launch = document.querySelector('[data-launch]');
  if (launch && store('gs-ai-done')) {
    launch.hidden = true;
    var u = document.querySelector('[data-ai] [data-used]'); if (u) u.hidden = false;
  }

  /* ---------- Studio page ---------- */
  var root = document.querySelector('[data-studio]');
  if (!root) return;
  function $(s) { return root.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
  var form = $('[data-st-form]'), used = $('[data-used]');
  if (store('gs-ai-done')) { form.hidden = true; used.hidden = false; return; }

  var file = $('[data-file]'), prev = $('[data-prev]'), drop = $('[data-drop]'),
    desc = $('#gs-ai-desc'), email = $('#gs-ai-email'), consent = $('[data-consent]'), err = $('[data-err]'), go = $('[data-go]'),
    loc = $('#gs-ai-loc'), hp = $('[data-hp]'), size = $('#gs-st-size'), keep = $('#gs-st-keep'), avoid = $('#gs-st-avoid');
  var steps = $$('[data-step]'), cur = 0, t0 = Date.now();
  var st = { photo: null, space: 'garden', exposure: '', water: '', style: '', maint: '', budget: '', colors: [], uses: [], feats: [] };
  if (store('gs-ai-email')) email.value = store('gs-ai-email');
  if (store('gs-ai-loc')) loc.value = store('gs-ai-loc');

  function showErr(msg) { err.textContent = msg; err.hidden = !msg; if (msg) err.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

  /* single choice (click again to clear, except space/exposure segments) */
  function single(attr, key, clearable) {
    $$('[data-' + attr + ']').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-' + attr), on = !(clearable && st[key] === v);
        st[key] = on ? v : '';
        $$('[data-' + attr + ']').forEach(function (x) { var y = on && x === b; x.classList.toggle('is-on', y); x.setAttribute('aria-pressed', y); });
      });
    });
  }
  function multi(attr, key, max) {
    $$('[data-' + attr + ']').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-' + attr), i = st[key].indexOf(v);
        if (i > -1) st[key].splice(i, 1);
        else { if (max && st[key].length >= max) { showErr(L().t.max4); return; } st[key].push(v); }
        showErr('');
        b.classList.toggle('is-on', i === -1); b.setAttribute('aria-pressed', i === -1);
      });
    });
  }
  single('sp', 'space'); single('ex', 'exposure'); single('water', 'water', true); single('style', 'style', true);
  single('maint', 'maint', true); single('budget', 'budget', true);
  multi('color', 'colors', 4); multi('use', 'uses', 8); multi('feat', 'feats', 10);
  $$('[data-size]').forEach(function (b) {
    b.addEventListener('click', function () { size.value = b.getAttribute('data-size'); $$('[data-size]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); });
  });
  size.addEventListener('input', function () { $$('[data-size]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-size') === size.value); }); });

  /* photo: resized in the browser to max 1280 px JPEG */
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
      st.photo = data; prev.src = data;
      $('.gs-drop-empty').hidden = true; $('.gs-drop-prev').hidden = false; drop.classList.add('has-photo');
    }, function () { showErr(t('e_file')); });
  }
  file.addEventListener('change', function () { setFile(file.files && file.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-drag'); }); });
  drop.addEventListener('drop', function (e) { setFile(e.dataTransfer.files && e.dataTransfer.files[0]); });

  /* ---------- Steps ---------- */
  function check(i) {
    if (i === 0 && !st.photo) return t('e_noimg');
    if (i === 1 && loc.value.trim().length < 2) { loc.focus(); return t('e_loc'); }
    return '';
  }
  function go_to(i) {
    cur = i;
    steps.forEach(function (s, j) { s.hidden = j !== i; });
    $$('[data-sn]').forEach(function (n, j) { n.classList.toggle('is-on', j === i); n.classList.toggle('is-done', j < i); });
    $('[data-st-bar]').style.width = ((i + 1) / steps.length * 100) + '%';
    if (i === steps.length - 1) summary();
    showErr('');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $$('[data-next]').forEach(function (b) { b.addEventListener('click', function () { var e = check(cur); if (e) return showErr(e); go_to(cur + 1); }); });
  $$('[data-back]').forEach(function (b) { b.addEventListener('click', function () { go_to(Math.max(0, cur - 1)); }); });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function names(group, keys) { var m = L()[group] || {}; return keys.map(function (k) { return m[k] || k; }).join(', '); }
  function summary() {
    var l = L(), T = l.t, rows = [];
    function row(k, v) { if (v) rows.push('<div><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>'); }
    row(T.space, (l.space || {})[st.space] + (size.value ? ' · ' + size.value + ' m²' : ''));
    row(T.loc, loc.value.trim());
    row(T.style, st.style && l.style[st.style]);
    row(T.colors, names('color', st.colors));
    row(T.maint, st.maint && l.maint[st.maint]);
    row(T.budget, st.budget && l.budget[st.budget]);
    row(T.uses, names('use', st.uses));
    row(T.feats, names('feat', st.feats));
    row(T.water, st.water && l.water[st.water]);
    row(T.keep, keep.value.trim()); row(T.avoid, avoid.value.trim());
    $('[data-st-sum]').innerHTML = (st.photo ? '<img src="' + st.photo + '" alt="">' : '') + '<div class="gs-st-rows">' + rows.join('') + '</div>';
  }

  /* the free-text description is required by the API: build one from the choices if left empty */
  function description() {
    var ds = desc.value.trim(); if (ds.length >= 3) return ds.slice(0, 400);
    var l = L(), parts = [];
    if (st.style) parts.push(l.t.styleOf + ' ' + l.style[st.style].toLowerCase());
    if (st.uses.length) parts.push(names('use', st.uses).toLowerCase());
    if (st.feats.length) parts.push(names('feat', st.feats).toLowerCase());
    var out = parts.join(', ');
    return (out.length >= 3 ? out : (l.space || {})[st.space] + ' — ' + l.t.noPref).slice(0, 400);
  }
  function prefs() {
    var p = {}, n = parseInt(size.value, 10);
    if (n >= 1 && n <= 5000) p.size_m2 = n;
    if (st.style) p.style = st.style;
    if (st.budget) p.budget = st.budget;
    if (st.maint) p.maintenance = st.maint;
    if (st.uses.length) p.uses = st.uses.slice();
    if (st.feats.length) p.features = st.feats.slice();
    if (st.colors.length) p.colors = st.colors.slice();
    if (keep.value.trim()) p.keep = keep.value.trim().slice(0, 200);
    if (avoid.value.trim()) p.avoid = avoid.value.trim().slice(0, 200);
    if (st.water) p.watering = st.water;
    return p;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    for (var i = 0; i < 2; i++) { var ce = check(i); if (ce) { go_to(i); return showErr(ce); } }
    var em = email.value.trim(), lc = loc.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return showErr(t('e_email'));
    if (!consent.checked) return showErr(t('e_consent'));
    showErr('');
    store('gs-ai-email', em); store('gs-ai-loc', lc);
    var req = { image: st.photo, description: description(), space: st.space, lang: lang(), email: em.toLowerCase(), consent: true, location: lc, hp: hp.value, t: Date.now() - t0 };
    if (st.exposure) req.exposure = st.exposure;
    var p = prefs(); if (Object.keys(p).length) req.prefs = p;
    try { sessionStorage.setItem('gs-ai-req', JSON.stringify(req)); }
    catch (x) { return showErr(t('e_file')); }
    go.disabled = true;
    location.href = RESULT_URL;
  });
})();
