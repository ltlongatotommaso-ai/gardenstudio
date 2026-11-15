(function () {
  var root = document.querySelector('[data-rp]');
  if (!root) return;
  var URL_AI = window.GS_AI_URL, S = window.GS_AI || {}, L = window.GS_LABELS || {}, I = window.GS_I18N || {};
  function lang() { return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'it'; }
  function t(k) { return (S[lang()] || {})[k] || ''; }
  function $(s) { return root.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function grp(n, sep) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep); }
  function eur(n) { n = Math.round(Number(n) || 0); return lang() === 'en' ? '€' + grp(n, ',') : grp(n, '.') + ' €'; }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  var busy = $('[data-rp-busy]'), res = $('[data-res]'), errBox = $('[data-rp-err]'), empty = $('[data-rp-empty]');
  function view(w) { busy.hidden = w !== 'busy'; res.hidden = w !== 'res'; errBox.hidden = w !== 'err'; empty.hidden = w !== 'empty'; window.scrollTo(0, 0); }

  var current = null;
  function reqLine(r) {
    if (!r) return '';
    var lbl = (L[lang()] && L[lang()].reqLbl) || (lang() === 'en' ? 'Your request' : 'La tua richiesta');
    return lbl + ': «' + (r.description || '') + '»' + (r.location ? ' · ' + r.location : '');
  }

  function render(d) {
    current = d;
    var lb = L[lang()] || {}, p = d.plan || {};
    $('[data-res-slider]').innerHTML =
      '<div class="gs-ba" data-ba><img src="' + d.image + '" alt="" width="1600" height="1000">' +
      (d.photo ? '<img class="gs-ba-before" src="' + d.photo + '" alt="" width="1600" height="1000">' : '') +
      (d.photo ? '<span class="gs-tag gs-tag-l">' + esc(lb.before) + '</span>' : '') + '<span class="gs-tag gs-tag-r">' + esc(lb.after) + '</span>' +
      (d.photo ? '<input type="range" min="0" max="100" value="50" aria-label="' + esc(lb.slider) + '"><div class="gs-ba-line" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg></span></div>' : '') + '</div>';
    var ba = $('[data-res-slider] .gs-ba'), input = ba.querySelector('input');
    ba.style.setProperty('--p', d.photo ? '50%' : '0%');
    if (input) input.addEventListener('input', function () { ba.style.setProperty('--p', input.value + '%'); });
    $('[data-r-title]').textContent = p.title || (lang() === 'en' ? 'Your design' : 'Il tuo progetto');
    $('[data-r-sum]').textContent = p.summary || '';
    $('[data-rp-req2]').textContent = reqLine(d.req);
    $('.gs-res-grid').hidden = !d.plan;
    $('[data-r-plants]').innerHTML = (p.plants || []).map(function (x) {
      return '<li><svg class="gs-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><div><b>' + esc(x.name) + (x.qty ? ' × ' + esc(x.qty) : '') + '</b>' +
        (x.size ? '<small class="gs-psize">' + esc(x.size) + '</small>' : '') + '<span>' + esc(x.why || '') + '</span></div>' +
        (x.price_eur ? '<em class="gs-pprice">' + eur(x.price_eur) + '</em>' : '') + '</li>';
    }).join('');
    $('[data-r-mats]').innerHTML = (p.materials || []).map(function (x) {
      return '<li><span>' + esc(x.item) + ' <small>· ' + esc(x.qty) + '</small>' + (x.pro_only ? ' <i class="gs-probadge">' + esc(t('proOnly')) + '</i>' : '') + '</span><b>' + eur(x.price_eur) + '</b></li>';
    }).join('');
    var tt = p.totals || {};
    $('[data-r-items]').textContent = eur(tt.items_eur || 0);
    $('[data-r-labour]').textContent = p.labour_eur ? '+ ' + eur(p.labour_eur) : '—';
    function range(a, b, fb) { return (a != null && b != null) ? eur(a).replace(/\s?€$/, '') + '–' + eur(b) : eur(fb); }
    $('[data-r-diy]').textContent = range(tt.diy_min, tt.diy_max, p.budget_diy_eur);
    $('[data-r-pro]').textContent = range(tt.pro_min, tt.pro_max, p.budget_pro_eur);
    $('[data-r-region]').textContent = p.region ? '· ' + t('region') + ' ' + p.region : '';
    $('[data-r-care]').innerHTML = (p.care || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('[data-dl]').href = d.image;
    view('res');
  }

  function showError(code) {
    var msg = t(code) || t('ai_failed');
    $('[data-rp-errmsg]').textContent = msg;
    var cta = $('[data-rp-errcta]');
    if (code === 'limit_email' && get('gs-ai-result')) { cta.href = location.pathname; }
    view('err');
  }

  /* Progress steps while the AI works */
  var timer = null;
  function startProgress() {
    var items = busy.querySelectorAll('.gs-progress li'), i = 0;
    items.forEach(function (li) { li.classList.remove('is-on'); });
    if (items[0]) items[0].classList.add('is-on');
    timer = setInterval(function () { if (i < items.length - 1) { i++; items[i].classList.add('is-on'); } }, 7000);
  }

  var rawReq = null;
  try { rawReq = sessionStorage.getItem('gs-ai-req'); } catch (e) {}

  if (rawReq) {
    var req = JSON.parse(rawReq);
    $('[data-busy-img]').src = req.image;
    $('[data-rp-req1]').textContent = reqLine(req);
    view('busy'); startProgress();
    var ctrl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 90000);
    fetch(URL_AI, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: rawReq, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return { error: 'ai_failed' }; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (o) {
        if (!o.ok || !o.j.image) throw new Error(o.j.error || 'ai_failed');
        var saved = { image: o.j.image, plan: o.j.plan, photo: req.image, req: { description: req.description, location: req.location, space: req.space }, at: Date.now() };
        try { sessionStorage.removeItem('gs-ai-req'); } catch (e) {}
        put('gs-ai-done', JSON.stringify({ email: req.email, at: Date.now() }));
        if (!put('gs-ai-result', JSON.stringify(saved))) { delete saved.photo; put('gs-ai-result', JSON.stringify(saved)); }
        render(saved);
        if (window.Shopify && Shopify.analytics && Shopify.analytics.publish) { try { Shopify.analytics.publish('gs_ai_render', { space: req.space }); } catch (x) {} }
      })
      .catch(function (x) {
        var code = x && x.name === 'AbortError' ? 'net' : (x && x.message) || 'net';
        if (/fetch|Load failed|NetworkError/i.test(code)) code = 'net';
        if (code === 'limit_email') { put('gs-ai-done', JSON.stringify({ email: req.email, at: Date.now() })); }
        if (code !== 'net' && code !== 'busy') { try { sessionStorage.removeItem('gs-ai-req'); } catch (e) {} }
        showError(code);
      })
      .then(function () { clearTimeout(to); clearInterval(timer); });
  } else {
    var savedRaw = get('gs-ai-result');
    if (savedRaw) { try { render(JSON.parse(savedRaw)); } catch (e) { view('empty'); } }
    else view('empty');
  }

  /* Re-render texts when the language changes */
  document.querySelectorAll('.gs-lang button').forEach(function (b) { b.addEventListener('click', function () { if (current) setTimeout(function () { render(current); }, 0); }); });
})();
