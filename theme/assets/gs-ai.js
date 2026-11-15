(function () {
  var root = document.querySelector('[data-ai]');
  if (!root) return;
  var S = window.GS_AI || {};
  var RESULT_URL = '/pages/il-tuo-progetto';
  function lang() { return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'it'; }
  function t(k) { return (S[lang()] || {})[k] || ''; }
  function $(s, el) { return (el || root).querySelector(s); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- Tabs ---------- */
  var tabs = document.querySelectorAll('.gs-tabs [data-tab]');
  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      tabs.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); });
      document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== b.getAttribute('data-tab'); });
    });
  });

  /* ---------- One free try per person: if already used, show the link to the saved design ---------- */
  var form = $('.gs-ai-form'), used = $('[data-used]');
  if (store('gs-ai-done')) { form.hidden = true; used.hidden = false; }

  /* ---------- Inputs ---------- */
  var file = $('[data-file]'), prev = $('[data-prev]'), drop = $('[data-drop]'),
    desc = $('#gs-ai-desc'), email = $('#gs-ai-email'), consent = $('[data-consent]'), err = $('[data-err]'), go = $('[data-go]'),
    loc = $('#gs-ai-loc'), hp = $('[data-hp]');
  var photo = null, space = 'garden', exposure = '', t0 = Date.now();
  if (store('gs-ai-email')) email.value = store('gs-ai-email');
  if (store('gs-ai-loc')) loc.value = store('gs-ai-loc');

  root.querySelectorAll('[data-sp]').forEach(function (b) {
    b.addEventListener('click', function () {
      space = b.getAttribute('data-sp');
      root.querySelectorAll('[data-sp]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });
  });
  root.querySelectorAll('[data-ex]').forEach(function (b) {
    b.addEventListener('click', function () {
      exposure = b.getAttribute('data-ex');
      root.querySelectorAll('[data-ex]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
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
    }, function () { showErr(t('e_file')); });
  }
  file.addEventListener('change', function () { setFile(file.files && file.files[0]); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-drag'); }); });
  drop.addEventListener('drop', function (e) { setFile(e.dataTransfer.files && e.dataTransfer.files[0]); });

  /* Hero upload: hand the file to the try form and jump there */
  var heroFile = document.querySelector('[data-hero-file]');
  if (heroFile) heroFile.addEventListener('change', function () {
    var f = heroFile.files && heroFile.files[0]; if (!f) return;
    setFile(f);
    var how = document.getElementById('how');
    if (how) how.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { desc.focus({ preventScroll: true }); }, 900);
  });

  /* ---------- Submit: save the request and open the results page ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var em = email.value.trim(), ds = desc.value.trim(), lc = loc.value.trim();
    if (!photo) return showErr(t('e_noimg'));
    if (ds.length < 3) return showErr(t('e_desc'));
    if (lc.length < 2) { loc.focus(); return showErr(t('e_loc')); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return showErr(t('e_email'));
    if (!consent.checked) return showErr(t('e_consent'));
    showErr('');
    store('gs-ai-email', em); store('gs-ai-loc', lc);
    var req = { image: photo, description: ds, space: space, lang: lang(), email: em.toLowerCase(), consent: true, location: lc, hp: hp.value, t: Date.now() - t0 };
    if (exposure) req.exposure = exposure;
    try { sessionStorage.setItem('gs-ai-req', JSON.stringify(req)); }
    catch (x) { return showErr(t('e_file')); }
    go.disabled = true;
    location.href = RESULT_URL;
  });
})();
