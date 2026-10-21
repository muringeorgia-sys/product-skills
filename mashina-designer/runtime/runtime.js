/* Рантайм кликабельного прототипа Mashina.kg.
   Встраивается в итоговый HTML скриптом scripts/build.cjs. Отвечает только за механику:
   экраны, переходы, окна, состояния, привязки, тосты, режим «Спека», журнал событий.
   Внешний вид интерфейса задают tokens.css и components.css дизайн-системы.
   Формат разметки описан в references/prototype-format.md. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;

  let cfg = {};
  const cfgEl = document.getElementById('proto-config');
  try { cfg = cfgEl ? JSON.parse(cfgEl.textContent) : {}; }
  catch (e) { console.error('[proto] proto-config: неверный JSON', e); }

  const platform = cfg.platform === 'mobile' ? 'mobile' : 'web';
  const mobileKind = cfg.mobileKind === 'app' ? 'app' : 'mweb';
  root.dataset.platform = platform;
  if (platform === 'mobile') root.dataset.mobileKind = mobileKind;

  const LAYER_TYPES = ['modal', 'sheet', 'drawer', 'popover'];
  const ACTION_SEL = '[data-go],[data-back],[data-open],[data-close],[data-toast],[data-set],[data-toggle],' +
    '[data-toggle-class],[data-submit],[data-event],[data-stub]';
  const INTERACTIVE_SEL = ACTION_SEL + ',a,button,input,select,textarea,label,summary,[contenteditable],[data-model]';

  const listeners = {};
  const emit = (name, ...args) => (listeners[name] || []).slice().forEach(fn => {
    try { fn(...args); } catch (e) { console.error('[proto] обработчик ' + name, e); }
  });

  const S = { screen: null, state: {}, layers: [], log: [], ready: false, issues: [] };
  const issue = msg => { if (!S.issues.includes(msg)) S.issues.push(msg); };
  const stateDefs = cfg.states || {};
  for (const [k, d] of Object.entries(stateDefs)) {
    const vals = Object.keys(d.values || {});
    S.state[k] = d.default != null ? String(d.default) : (vals[0] || '');
  }
  Object.assign(S.state, cfg.initial || {});
  // auth нужен шаблонам шапки: если фича его не объявила, прототип показывает гостя без переключателя
  if (!('auth' in S.state)) S.state.auth = 'guest';
  // "themes": true — переключатель светлой и тёмной темы DS на панели
  if (cfg.themes && !stateDefs.theme) { stateDefs.theme = { label: 'Тема', values: { light: 'Светлая', dark: 'Тёмная' }, default: 'light' }; S.state.theme = 'light'; }

  /* ---------- форматирование ---------- */
  const NBSP = ' ';
  const toNum = v => {
    if (typeof v === 'number') return v;
    const n = Number(String(v == null ? '' : v).replace(/[^\d.,-]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const fmt = {
    num: v => Math.round(toNum(v)).toLocaleString('ru-RU').replace(/\s/g, NBSP),
    som: v => fmt.num(v) + NBSP + (cfg.somLabel || '⃀'),
    usd: v => ((cfg.usdBefore != null ? cfg.usdBefore : (platform === 'mobile' && mobileKind === 'app')) ? '$' + fmt.num(v) : fmt.num(v) + NBSP + '$'),
    pct: v => String(toNum(v)).replace('.', ',') + NBSP + '%',
    raw: v => (v == null ? '' : String(v))
  };
  const format = (v, f) => (fmt[f] || fmt.raw)(v);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- адрес: #/экран?ключ=значение&open=окно&shot=1&full=1 ---------- */
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const i = h.indexOf('?');
    const id = i < 0 ? h : h.slice(0, i);
    const p = new URLSearchParams(i < 0 ? '' : h.slice(i + 1));
    return { id, p };
  }
  const flags = (() => { const { p } = parseHash(); return { shot: p.get('shot') === '1', full: p.get('full') === '1' }; })();
  function buildHash(id) {
    const p = new URLSearchParams();
    for (const k of Object.keys(stateDefs)) if (S.state[k] != null) p.set(k, S.state[k]);
    if (flags.shot) p.set('shot', '1');
    if (flags.full) p.set('full', '1');
    const q = p.toString();
    return '#/' + id + (q ? '?' + q : '');
  }

  /* ---------- условия data-if ---------- */
  const truthy = v => !(v == null || v === '' || v === false || v === 'false' || v === '0' || v === 0);
  function testTerm(t) {
    let m;
    if ((m = t.match(/^(!?)([\w.-]+)$/))) return m[1] ? !truthy(S.state[m[2]]) : truthy(S.state[m[2]]);
    if ((m = t.match(/^([\w.-]+)(>=|<=|>|<)(-?[\d.]+)$/))) {
      const a = toNum(S.state[m[1]]), b = Number(m[3]);
      return m[2] === '>' ? a > b : m[2] === '<' ? a < b : m[2] === '>=' ? a >= b : a <= b;
    }
    if ((m = t.match(/^([\w.-]+)(!?):(.*)$/))) {
      const hit = m[3].split('|').includes(String(S.state[m[1]] == null ? '' : S.state[m[1]]));
      return m[2] ? !hit : hit;
    }
    issue('data-if: не разобрано условие «' + t + '»');
    return true;
  }
  const test = expr => String(expr).trim().split(/\s+/).filter(Boolean).every(testTerm);

  /* ---------- применение состояния ---------- */
  function apply() {
    $$('[data-if]').forEach(el => { el.hidden = !test(el.dataset.if); });
    $$('[data-set]').forEach(el => {
      const [k, v] = splitKV(el.dataset.set);
      const on = String(S.state[k]) === v;
      el.classList.toggle('is-selected', on);
      if (el.matches('button,[role="tab"],[role="radio"]')) el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $$('[data-toggle]').forEach(el => el.classList.toggle('is-selected', truthy(S.state[el.dataset.toggle])));
    $$('[data-text]').forEach(el => { el.textContent = format(S.state[el.dataset.text], el.dataset.format); });
    $$('[data-model]').forEach(el => {
      if (document.activeElement === el) return;
      const v = S.state[el.dataset.model];
      if (v == null) return;
      if (el.type === 'checkbox') el.checked = truthy(v);
      else if (el.type === 'radio') el.checked = String(v) === el.value;
      else el.value = el.dataset.mask === 'num' ? fmt.num(v) : v;
    });
    $$('[data-selected]').forEach(c => $$('[data-value]', c).forEach(i => i.classList.toggle('is-selected', i.dataset.value === c.dataset.selected)));
    if (S.state.theme) $$('.proto-device').forEach(d => d.setAttribute('data-theme', S.state.theme));
    for (const k of Object.keys(stateDefs)) root.setAttribute('data-s-' + k, S.state[k]);
    if (S.screen) history.replaceState(null, '', buildHash(S.screen));
    syncBar();
    if (spec.on) spec.draw();
  }
  const splitKV = s => { const i = String(s).indexOf(':'); return i < 0 ? [s, 'true'] : [s.slice(0, i), s.slice(i + 1)]; };

  function set(k, v, o = {}) { patch({ [k]: v }, o); }
  let applying = false;
  function patch(obj, o = {}) {
    Object.assign(S.state, obj);
    if (!o.silent && !applying) { applying = true; try { emit('state', Object.assign({}, S.state), obj); } finally { applying = false; } }
    apply();
  }

  /* ---------- экраны ---------- */
  const screens = () => $$('[data-screen]');
  const findScreen = id => screens().find(s => s.dataset.screen === id);
  function go(id, o = {}) {
    const el = findScreen(id);
    if (!el) { toast('Экран «' + id + '» не найден в прототипе', { kind: 'proto' }); issue('data-go: нет экрана «' + id + '»'); return; }
    closeAll();
    screens().forEach(s => s.classList.toggle('is-current', s === el));
    const prev = S.screen;
    S.screen = id;
    const h = buildHash(id);
    if (o.replace || !prev) history.replaceState(null, '', h); else history.pushState(null, '', h);
    window.scrollTo(0, 0);
    $$('.scr-body', el).concat([el]).forEach(n => { n.scrollTop = 0; });
    document.title = (el.dataset.title || id) + ' · ' + (cfg.feature || 'Прототип');
    if (el.dataset.screenEvent) track(el.dataset.screenEvent, readParams(el, 'screenParams'));
    apply();
    emit('screen', id, prev);
  }
  function back() {
    if (S.layers.length) { close(); return; }
    if (history.length > 1) history.back(); else go(cfg.start || (screens()[0] || {}).dataset.screen);
  }
  window.addEventListener('popstate', () => {
    const { id } = parseHash();
    if (id && id !== S.screen && findScreen(id)) {
      closeAll();
      screens().forEach(s => s.classList.toggle('is-current', s.dataset.screen === id));
      const prev = S.screen; S.screen = id;
      const el = findScreen(id);
      if (el.dataset.screenEvent) track(el.dataset.screenEvent, readParams(el, 'screenParams'));
      apply(); emit('screen', id, prev);
    }
  });

  /* ---------- слои: окно, шторка, боковая панель, выпадающее меню ---------- */
  const layerEl = id => $('.proto-layer[data-layer="' + CSS.escape(id) + '"]');
  function open(id, trigger) {
    const L = layerEl(id);
    if (!L) { toast('Окно «' + id + '» не найдено в прототипе', { kind: 'proto' }); issue('data-open: нет окна «' + id + '»'); return; }
    if (L.dataset.type !== 'popover') S.layers.filter(x => layerEl(x) && layerEl(x).dataset.type === 'popover').forEach(close);
    if (!S.layers.includes(id)) S.layers.push(id);
    L.hidden = false;
    L.style.zIndex = String(500 + S.layers.length * 10);
    if (L.dataset.type === 'popover') placePopover(L, trigger);
    requestAnimationFrame(() => L.classList.add('is-open'));
    const f = $('[autofocus],input:not([type=hidden]),select,textarea,button', L.querySelector('.proto-layer__box'));
    if (f && L.dataset.type !== 'popover' && !flags.shot) setTimeout(() => f.focus({ preventScroll: true }), 30);
    const src = L.querySelector('.proto-layer__box > *');
    if (src && src.dataset.openEvent) track(src.dataset.openEvent, readParams(src, 'openParams'));
    apply();
    emit('open', id);
  }
  function close(id) {
    const target = id || S.layers[S.layers.length - 1];
    if (!target) return;
    const L = layerEl(target);
    S.layers = S.layers.filter(x => x !== target);
    if (L) { L.classList.remove('is-open'); setTimeout(() => { if (!L.classList.contains('is-open')) L.hidden = true; }, flags.shot ? 0 : 180); }
    emit('close', target);
  }
  function closeAll() { S.layers.slice().reverse().forEach(close); }
  function placePopover(L, trigger) {
    const box = L.querySelector('.proto-layer__box');
    const host = L.getBoundingClientRect();
    if (!trigger) { box.style.left = '50%'; box.style.top = '80px'; box.style.transform = 'translateX(-50%)'; return; }
    const r = trigger.getBoundingClientRect();
    box.style.transform = '';
    box.style.top = (r.bottom - host.top + 6) + 'px';
    const left = Math.min(r.left - host.left, host.width - box.offsetWidth - 8);
    box.style.left = Math.max(8, left) + 'px';
  }

  /* ---------- тосты ---------- */
  function toast(text, o = {}) {
    const host = $('.proto-toasts');
    if (!host) return;
    const t = document.createElement('div');
    t.className = o.kind === 'proto' ? 'proto-note-toast' : 'toast';
    if (o.kind && o.kind !== 'proto') t.classList.add('toast--' + o.kind);
    t.setAttribute('role', 'status');
    t.textContent = text;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-open'));
    setTimeout(() => { t.classList.remove('is-open'); setTimeout(() => t.remove(), 250); }, o.ms || 3000);
  }

  /* ---------- события аналитики ---------- */
  function readParams(el, key = 'eventParams') {
    const raw = el.dataset[key];
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (e) { issue('data-event-params: неверный JSON у «' + (el.dataset.event || '') + '»'); return {}; }
  }
  function track(name, params = {}) {
    const p = {};
    for (const [k, v] of Object.entries(params)) p[k] = typeof v === 'string' && v.startsWith('$') ? S.state[v.slice(1)] : v;
    const rec = { t: new Date().toLocaleTimeString('ru-RU'), name, params: p, screen: S.screen };
    S.log.unshift(rec);
    console.info('[event]', name, p);
    panel.renderLog();
    emit('event', rec);
  }

  /* ---------- форма: проверка обязательных полей ---------- */
  function validate(trigger) {
    const form = trigger.closest('form,[data-form]') || (trigger.dataset.submit && $(trigger.dataset.submit)) || null;
    if (!form) return true;
    let ok = true, first = null;
    $$('input,select,textarea', form).forEach(inp => {
      if (inp.closest('[hidden]')) return;
      const bad = !inp.checkValidity() || (inp.required && inp.type === 'checkbox' && !inp.checked);
      markField(inp, bad);
      if (bad) { ok = false; first = first || inp; }
    });
    if (first) first.focus({ preventScroll: false });
    return ok;
  }
  function markField(inp, bad) {
    inp.classList.toggle('is-error', bad);
    const w = inp.closest('[data-field]');
    if (!w) return;
    w.classList.toggle('is-error', bad);
    $$('[data-error]', w).forEach(e => { e.hidden = !bad; });
  }

  /* ---------- клики ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('.proto-bar,.proto-panel,.proto-fab')) return;
    const el = e.target.closest(ACTION_SEL);
    if (!el) {
      const a = e.target.closest('a[href]');
      if (a && !a.closest('[data-allow-link]')) {
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('#/')) { e.preventDefault(); toast('Этот переход не входит в прототип', { kind: 'proto' }); }
        return;
      }
      if (!e.target.closest(INTERACTIVE_SEL)) hint();
      return;
    }
    if (el.matches('a') || (el.matches('button') && el.closest('form'))) e.preventDefault();
    if (el.matches('[disabled],.is-disabled,[aria-disabled="true"]')) return;
    run(el);
  });
  // Enter в поле формы и кнопки без data-*: прототип никогда не отправляет форму по-настоящему
  document.addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.submitter || e.target.querySelector('[data-submit],button[type="submit"],button:not([type])');
    if (btn && btn.matches(ACTION_SEL) && !btn.matches('[disabled],.is-disabled')) run(btn);
  });

  function run(el) {
    if (el.hasAttribute('data-submit') && !validate(el)) return;
    const ms = Number(el.dataset.loading || 0);
    if (ms > 0 && !el.classList.contains('is-loading')) {
      el.classList.add('is-loading'); el.setAttribute('aria-busy', 'true');
      setTimeout(() => { el.classList.remove('is-loading'); el.removeAttribute('aria-busy'); act(el); }, flags.shot ? 0 : ms);
      return;
    }
    act(el);
  }
  function act(el) {
    const d = el.dataset;
    if (d.event && !el.matches('input,select,textarea')) track(d.event, readParams(el));
    if (d.toggleClass) ($(d.target || '') || el).classList.toggle(d.toggleClass);
    const upd = {};
    if (d.set) String(d.set).split(/\s+/).filter(Boolean).forEach(pair => { const [k, v] = splitKV(pair); upd[k] = v; });
    if (d.toggle) upd[d.toggle] = !truthy(S.state[d.toggle]);
    if (Object.keys(upd).length) patch(upd);
    if (el.hasAttribute('data-close')) close(d.close || undefined);
    if (d.open) open(d.open, el);
    if (d.go) go(d.go);
    if (el.hasAttribute('data-back')) back();
    if (d.toast) toast(d.toast, { kind: d.toastKind });
    if (d.stub != null) toast(d.stub || 'Этот переход не входит в прототип', { kind: 'proto' });
  }

  /* ---------- поля с привязкой data-model ---------- */
  function readModel(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'radio') return el.checked ? el.value : S.state[el.dataset.model];
    if (el.dataset.mask === 'num' || el.type === 'range' || el.type === 'number') return toNum(el.value);
    return el.value;
  }
  document.addEventListener('input', e => {
    const el = e.target.closest('[data-model]');
    if (el) {
      if (el.dataset.mask === 'num' && el.type !== 'range') {
        const digits = el.value.replace(/\D/g, '');
        el.value = digits ? fmt.num(Number(digits)) : '';
      }
      set(el.dataset.model, readModel(el));
    }
    if (e.target.matches && e.target.matches('.is-error')) markField(e.target, !e.target.checkValidity());
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-model]');
    if (el && (el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT')) set(el.dataset.model, readModel(el));
    if (el && el.dataset.event) track(el.dataset.event, readParams(el));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.layers.length) close();
  });

  /* ---------- подсказка кликабельных зон ---------- */
  let hintTimer = 0;
  function hint() {
    root.classList.add('proto-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => root.classList.remove('proto-hint'), 900);
  }

  /* ---------- повторяемые элементы <template data-each> ---------- */
  const data = Object.assign({}, cfg.data || {});
  function renderEach(key) {
    $$('template[data-each]').filter(t => !key || t.dataset.each === key).forEach(t => {
      $$('[data-each-of="' + t.dataset.each + '"]').forEach(n => n.remove());
      const items = data[t.dataset.each] || [];
      const html = t.innerHTML;
      const frag = document.createDocumentFragment();
      items.forEach((item, i) => {
        const s = html.replace(/\{\{\s*([\w.]+)\s*(?:\|\s*(\w+))?\s*\}\}/g, (_, k, f) => {
          const v = k === '@index' ? i : k.split('.').reduce((o, p) => (o == null ? o : o[p]), item);
          return esc(format(v, f));
        });
        const box = document.createElement('template');
        box.innerHTML = s.trim();
        $$('[data-item-if]', box.content).forEach(n => { const k = n.dataset.itemIf; const neg = k.startsWith('!'); const v = item[k.replace(/^!/, '')]; if (neg ? truthy(v) : !truthy(v)) n.remove(); });
        Array.from(box.content.children).forEach(c => { c.setAttribute('data-each-of', t.dataset.each); frag.appendChild(c); });
      });
      t.after(frag);
    });
  }

  /* ---------- иконки в разметке, созданной скриптом фичи ---------- */
  function hydrateIcons(scope) {
    $$('i[data-icon]', scope).forEach(i => {
      const name = i.dataset.icon;
      if (!document.getElementById('ic-' + name)) { issue('иконка «' + name + '» не попала в спрайт: добавь её в разметку исходника'); return; }
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', ('ic ' + (i.getAttribute('class') || '')).trim());
      if (i.getAttribute('style')) svg.setAttribute('style', i.getAttribute('style'));
      svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#ic-' + name);
      svg.appendChild(use);
      i.replaceWith(svg);
    });
  }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) hydrateIcons(n.matches && n.matches('i[data-icon]') ? n.parentNode : n); }))).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- оболочка: панель прототипа, сцена, устройство ---------- */
  let bar = null;
  function buildShell() {
    const body = document.body;
    const stage = document.createElement('div'); stage.className = 'proto-stage';
    const device = document.createElement('div'); device.className = 'proto-device proto-device--' + platform;
    const wrap = document.createElement('div'); wrap.className = 'proto-screens';
    if (platform === 'mobile' && mobileKind === 'app') {
      const sb = document.createElement('div'); sb.className = 'proto-statusbar';
      sb.innerHTML = '<span>9:41</span><span class="proto-statusbar__icons"><i></i><i></i><i></i></span>';
      device.appendChild(sb);
    }
    device.appendChild(wrap);
    stage.appendChild(device);
    const layerHost = platform === 'mobile' ? device : body;
    screens().forEach(s => wrap.appendChild(s));
    $$(LAYER_TYPES.map(t => '[data-' + t + ']').join(',')).forEach(el => {
      const type = LAYER_TYPES.find(t => el.hasAttribute('data-' + t));
      const L = document.createElement('div');
      L.className = 'proto-layer proto-layer--' + type;
      L.dataset.layer = el.getAttribute('data-' + type);
      L.dataset.type = type;
      L.hidden = true;
      L.setAttribute('role', type === 'popover' ? 'menu' : 'dialog');
      if (type !== 'popover') L.setAttribute('aria-modal', 'true');
      L.innerHTML = '<div class="proto-backdrop"></div><div class="proto-layer__box"></div>';
      L.firstChild.addEventListener('click', () => close(L.dataset.layer));
      L.lastChild.appendChild(el);
      layerHost.appendChild(L);
    });
    const toasts = document.createElement('div'); toasts.className = 'proto-toasts';
    layerHost.appendChild(toasts);
    body.insertBefore(stage, body.firstChild);
    if (!flags.shot) { buildBar(); panel.build(); }
  }

  function buildBar() {
    bar = document.createElement('div');
    bar.className = 'proto-bar';
    const list = screens().map(s => '<option value="' + esc(s.dataset.screen) + '">' + esc(s.dataset.title || s.dataset.screen) + '</option>').join('');
    const st = Object.entries(stateDefs).map(([k, d]) =>
      '<span class="proto-bar__group" title="' + esc(d.hint || '') + '"><b>' + esc(d.label || k) + '</b>' +
      Object.entries(d.values || {}).map(([v, lab]) => '<button type="button" data-pk="' + esc(k) + '" data-pv="' + esc(v) + '">' + esc(lab) + '</button>').join('') + '</span>').join('');
    const otherLabel = platform === 'web' ? 'Mobile →' : 'Web →';
    bar.innerHTML =
      '<span class="proto-bar__tag">Прототип</span>' +
      '<span class="proto-bar__title">' + esc(cfg.feature || '') + ' · ' + (platform === 'web' ? 'Web 1440' : (mobileKind === 'app' ? 'Приложение 390' : 'Mobile web 390')) + '</span>' +
      '<span class="proto-bar__group"><button type="button" data-pnav="-1" title="Предыдущий экран">‹</button>' +
      '<select class="proto-bar__select" aria-label="Экран">' + list + '</select>' +
      '<button type="button" data-pnav="1" title="Следующий экран">›</button></span>' + st +
      '<span class="proto-bar__sp"></span>' +
      '<button type="button" data-ptool="hint" title="Подсветить кликабельные зоны">Клики</button>' +
      '<button type="button" data-ptool="spec" title="Компоненты DS и заметки на экране">Спека</button>' +
      '<button type="button" data-ptool="panel" title="Экраны, заметки, события">Панель</button>' +
      (cfg.other ? '<a class="proto-bar__link" data-allow-link href="' + esc(cfg.other) + '">' + otherLabel + '</a>' : '') +
      '<button type="button" data-ptool="reset" title="Начать сначала">Сброс</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pk) set(b.dataset.pk, b.dataset.pv);
      if (b.dataset.pnav) {
        const ids = screens().map(s => s.dataset.screen); const i = ids.indexOf(S.screen);
        go(ids[(i + Number(b.dataset.pnav) + ids.length) % ids.length]);
      }
      const t = b.dataset.ptool;
      if (t === 'hint') { root.classList.toggle('proto-hint-on'); b.classList.toggle('on'); }
      if (t === 'spec') { spec.toggle(); b.classList.toggle('on', spec.on); }
      if (t === 'panel') panel.toggle();
      if (t === 'reset') { location.hash = ''; location.reload(); }
    });
    bar.querySelector('select').addEventListener('change', e => go(e.target.value));
    if (platform === 'mobile') {
      const fab = document.createElement('button');
      fab.type = 'button'; fab.className = 'proto-fab'; fab.textContent = '☰';
      fab.title = 'Панель прототипа';
      fab.addEventListener('click', () => root.classList.toggle('proto-bar-open'));
      document.body.appendChild(fab);
    }
  }
  function syncBar() {
    if (!bar) return;
    const sel = bar.querySelector('select'); if (sel && S.screen) sel.value = S.screen;
    $$('[data-pk]', bar).forEach(b => b.classList.toggle('on', String(S.state[b.dataset.pk]) === b.dataset.pv));
    panel.renderScreen();
  }

  /* ---------- боковая панель: экраны, заметки, события ---------- */
  const panel = {
    on: false, el: null, tab: 'screens',
    build() {
      const p = document.createElement('aside');
      p.className = 'proto-panel'; p.hidden = true;
      p.innerHTML = '<div class="proto-panel__tabs"><button type="button" data-ptab="screens">Экраны</button><button type="button" data-ptab="notes">Заметки</button><button type="button" data-ptab="events">События</button><button type="button" data-ptab="x" title="Закрыть">×</button></div><div class="proto-panel__body"></div>';
      p.addEventListener('click', e => {
        const b = e.target.closest('[data-ptab]'); if (b) { if (b.dataset.ptab === 'x') this.toggle(false); else { this.tab = b.dataset.ptab; this.render(); } }
        const g = e.target.closest('[data-pgo]'); if (g) go(g.dataset.pgo);
      });
      document.body.appendChild(p); this.el = p;
    },
    toggle(v) {
      this.on = v == null ? !this.on : v;
      if (this.el) { this.el.hidden = !this.on; this.el.style.top = (bar && getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0) + 'px'; }
      root.classList.toggle('proto-panel-on', this.on);
      if (bar) { const b = bar.querySelector('[data-ptool="panel"]'); if (b) b.classList.toggle('on', this.on); }
      this.render();
    },
    render() {
      if (!this.el || !this.on) return;
      $$('[data-ptab]', this.el).forEach(b => b.classList.toggle('on', b.dataset.ptab === this.tab));
      const body = this.el.querySelector('.proto-panel__body');
      if (this.tab === 'screens') {
        body.innerHTML = '<ol class="proto-list">' + screens().map(s => '<li class="' + (s.dataset.screen === S.screen ? 'on' : '') + '" data-pgo="' + esc(s.dataset.screen) + '"><b>' + esc(s.dataset.title || s.dataset.screen) + '</b><span>' + esc(s.dataset.screen) + '</span></li>').join('') + '</ol>' +
          '<p class="proto-muted">Окна: ' + ($$('.proto-layer').map(l => esc(l.dataset.layer)).join(', ') || 'нет') + '</p>';
      } else if (this.tab === 'notes') {
        const cur = findScreen(S.screen);
        const notes = cur ? $$('[data-note]', cur).concat($$('.proto-layer.is-open [data-note]')) : [];
        const ds = {};
        if (cur) $$('[data-ds]', cur).forEach(n => { if (!n.closest('[hidden]')) ds[n.dataset.ds] = (ds[n.dataset.ds] || 0) + 1; });
        body.innerHTML = (cur && cur.dataset.note ? '<p class="proto-screen-note">' + esc(cur.dataset.note) + '</p>' : '') +
          '<ol class="proto-list proto-list--notes">' + (notes.filter(n => n !== cur).map((n, i) => '<li><b>' + (i + 1) + '.</b> ' + esc(n.dataset.note) + '</li>').join('') || '<li class="proto-muted">Заметок на экране нет</li>') + '</ol>' +
          '<h4>Компоненты DS на экране</h4><ul class="proto-list">' + (Object.entries(ds).map(([k, c]) => '<li><b>' + esc(k) + '</b><span>× ' + c + '</span></li>').join('') || '<li class="proto-muted">Нет пометок data-ds</li>') + '</ul>';
      } else {
        body.innerHTML = '<ol class="proto-list proto-list--log">' + (S.log.map(r => '<li><b>' + esc(r.name) + '</b><span>' + esc(r.t) + ' · ' + esc(r.screen || '') + '</span><code>' + esc(JSON.stringify(r.params)) + '</code></li>').join('') || '<li class="proto-muted">Событий пока нет. Кликните по элементам с событиями.</li>') + '</ol>';
      }
    },
    renderScreen() { if (this.on && this.tab !== 'events') this.render(); },
    renderLog() { if (this.on && this.tab === 'events') this.render(); }
  };

  /* ---------- режим «Спека»: подписи компонентов и номера заметок ---------- */
  const spec = {
    on: false, layer: null, raf: 0,
    toggle() {
      this.on = !this.on;
      root.classList.toggle('proto-spec', this.on);
      if (!this.layer) { this.layer = document.createElement('div'); this.layer.className = 'proto-spec-layer'; document.body.appendChild(this.layer); }
      this.layer.hidden = !this.on;
      this.draw();
    },
    draw() {
      if (!this.on || !this.layer) return;
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => {
        const cur = findScreen(S.screen);
        const scope = $$('.proto-layer.is-open .proto-layer__box').concat(cur ? [cur] : []);
        let n = 0; const out = [];
        scope.forEach(sc => $$('[data-ds],[data-note]', sc).forEach(el => {
          if (el.closest('[hidden]')) return;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return;
          if (el.dataset.ds) out.push('<div class="proto-spec-box" style="left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px"><span>' + esc(el.dataset.ds) + '</span></div>');
          if (el.dataset.note && el !== cur) { n++; out.push('<div class="proto-spec-pin" title="' + esc(el.dataset.note) + '" style="left:' + (r.right - 10) + 'px;top:' + (r.top - 10) + 'px">' + n + '</div>'); }
        }));
        this.layer.innerHTML = out.join('');
      });
    }
  };
  document.addEventListener('scroll', () => spec.draw(), true);
  window.addEventListener('resize', () => spec.draw());

  /* ---------- проверка целостности прототипа ---------- */
  function lint() {
    const issues = S.issues.slice();
    const ids = new Set(screens().map(s => s.dataset.screen));
    const layers = new Set($$('.proto-layer').map(l => l.dataset.layer));
    $$('[data-go]').forEach(el => { if (!ids.has(el.dataset.go) && !el.dataset.go.includes('{{')) issues.push('data-go: нет экрана «' + el.dataset.go + '»'); });
    $$('[data-open]').forEach(el => { if (!layers.has(el.dataset.open) && !el.dataset.open.includes('{{')) issues.push('data-open: нет окна «' + el.dataset.open + '»'); });
    $$('[data-screen]').forEach(el => { if (!el.dataset.title) issues.push('экран «' + el.dataset.screen + '» без data-title'); });
    Array.from(document.body.children).forEach(el => {
      if (el.matches('script,template,svg,.proto-stage,.proto-bar,.proto-panel,.proto-layer,.proto-toasts,.proto-spec-layer,.proto-fab')) return;
      issues.push('элемент <' + el.tagName.toLowerCase() + (el.className ? ' class="' + el.className + '"' : '') + '> вне экранов и окон: его не видно в устройстве');
    });
    $$('[data-if]').forEach(el => String(el.dataset.if).split(/\s+/).filter(Boolean).forEach(t => {
      const k = t.replace(/^!/, '').split(/[:<>=!]/)[0];
      if (!(k in S.state)) issues.push('data-if: ключ «' + k + '» не задан ни в states, ни в initial');
    }));
    return Array.from(new Set(issues));
  }
  function manifest() {
    return {
      feature: cfg.feature || '', platform, mobileKind,
      start: cfg.start || (screens()[0] || {}).dataset.screen,
      screens: screens().map(s => ({ id: s.dataset.screen, title: s.dataset.title || '', states: s.dataset.shotStates || '' })),
      overlays: $$('.proto-layer').map(l => { const src = l.querySelector('.proto-layer__box > *'); return { id: l.dataset.layer, type: l.dataset.type, over: (src && src.dataset.over) || '', states: (src && src.dataset.shotStates) || '' }; }),
      states: stateDefs
    };
  }

  /* ---------- запуск ---------- */
  function init() {
    if (flags.shot) root.classList.add('proto-shot');
    if (flags.full) root.classList.add('proto-full');
    const small = () => root.classList.toggle('proto-real', platform === 'mobile' && innerWidth < 600 && !flags.shot);
    small(); window.addEventListener('resize', small);
    renderEach();
    buildShell();
    const { id, p } = parseHash();
    for (const k of Object.keys(stateDefs)) if (p.has(k)) S.state[k] = p.get(k);
    $$('[data-model]').forEach(el => { if (S.state[el.dataset.model] == null) S.state[el.dataset.model] = readModel(el); });
    const first = screens()[0];
    const start = findScreen(id) ? id : (cfg.start && findScreen(cfg.start) ? cfg.start : (first ? first.dataset.screen : ''));
    S.ready = true;
    emit('state', Object.assign({}, S.state), {});
    if (start) go(start, { replace: true });
    if (p.get('open')) open(p.get('open'));
    emit('ready');
    const issues = lint();
    if (issues.length) console.warn('[proto] проблемы прототипа:\n- ' + issues.join('\n- '));
  }

  window.Proto = {
    go, back, open, close, closeAll, toast, set, patch, track, fmt, data, lint, manifest,
    render: renderEach,
    get: k => S.state[k],
    get state() { return Object.assign({}, S.state); },
    get screen() { return S.screen; },
    on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); return this; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
})();
