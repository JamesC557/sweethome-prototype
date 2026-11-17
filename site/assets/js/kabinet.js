/* Демо личного кабинета. Все данные вымышленные, ничего не отправляется. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const STATUSES = ['Новая', 'Подтверждена', 'Заселён', 'Выехал', 'Документы готовы'];
  const staff = [
    { n: 'Иванов И.', ph: '+7 900 000-00-01', em: 'ivanov@example.ru', dep: 'Производственный отдел', role: 'Бронирует', st: 'Активен' },
    { n: 'Петров П.', ph: '+7 900 000-00-02', em: 'petrov@example.ru', dep: 'Производственный отдел', role: 'Только просмотр', st: 'Активен' },
    { n: 'Сидорова А.', ph: '+7 900 000-00-03', em: 'sidorova@example.ru', dep: 'Администрация', role: 'Администратор', st: 'Активен' },
    { n: 'Кузнецов Д.', ph: '+7 900 000-00-04', em: 'kuznetsov@example.ru', dep: 'Отдел снабжения', role: 'Бронирует', st: 'Активен' },
    { n: 'Смирнова Е.', ph: '+7 900 000-00-05', em: 'smirnova@example.ru', dep: 'Отдел снабжения', role: 'Бухгалтер', st: 'Приглашён' },
    { n: 'Волков С.', ph: '+7 900 000-00-06', em: 'volkov@example.ru', dep: 'Производственный отдел', role: 'Только просмотр', st: 'Отключён' },
  ];
  const orders = [
    { id: 'Д-1024', g: ['Иванов И.', 'Петров П.'], apt: 'Студия, ул. Депутатская (демо)', from: '18.11', to: '21.11', n: 3, st: 0, by: 'Сидорова А.' },
    { id: 'Д-1021', g: ['Кузнецов Д.'], apt: 'Студия, ул. Можайского (демо)', from: '14.11', to: '17.11', n: 3, st: 2, by: 'Кузнецов Д.' },
    { id: 'Д-1019', g: ['Волков С.'], apt: 'Подбирается', from: '20.11', to: '22.11', n: 2, st: 1, by: 'Сидорова А.' },
    { id: 'Д-1012', g: ['Иванов И.'], apt: 'Студия, пр. Юрия Тена (демо)', from: '03.11', to: '07.11', n: 4, st: 3, by: 'Иванов И.' },
    { id: 'Д-1004', g: ['Петров П.', 'Кузнецов Д.'], apt: 'Студия, ул. Депутатская (демо)', from: '21.10', to: '25.10', n: 4, st: 4, by: 'Сидорова А.' },
    { id: 'Д-0998', g: ['Смирнова Е.'], apt: 'Студия, ул. Можайского (демо)', from: '10.10', to: '12.10', n: 2, st: 4, by: 'Смирнова Е.' },
  ];
  const sum = '<span>— ₽ <small>демо</small></span>';

  // Навигация по разделам (hash)
  function show() {
    const v = (location.hash || '#home').slice(1).split('/')[0];
    const id = $('#v-' + v) ? v : 'home';
    $$('.view').forEach((s) => { s.hidden = s.id !== 'v-' + id; });
    $$('[data-view]').forEach((a) => a.classList.toggle('on', a.dataset.view === id));
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', show);

  // Тосты
  let tt;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 2600); }

  const badge = (i) => `<span class="st st${i}">${STATUSES[i]}</span>`;

  // Ближайшие заезды
  $('#upcoming').innerHTML = orders.filter((o) => o.st <= 1).map((o) =>
    `<li><b>${o.from}–${o.to}</b> · ${esc(o.g.join(', '))}<br><span class="muted">${esc(o.apt)}</span> ${badge(o.st)}</li>`).join('');

  // Таблица броней (на мобильном — карточки через data-label)
  function renderOrders() {
    const q = $('#o-search').value.trim().toLowerCase(), st = $('#o-status').value;
    $('#orders-body').innerHTML = orders.filter((o) => (!q || o.id.toLowerCase().includes(q)) && (st === '' || String(o.st) === st)).map((o) =>
      `<tr data-id="${o.id}" tabindex="0"><td data-label="№"><b>${o.id}</b></td><td data-label="Гости">${esc(o.g.join(', '))}</td><td data-label="Студия">${esc(o.apt)}</td><td data-label="Даты">${o.from}–${o.to}</td><td data-label="Ночей">${o.n}</td><td data-label="Статус">${badge(o.st)}</td><td data-label="Сумма">${sum}</td></tr>`).join('') ||
      '<tr><td colspan="7">Ничего не найдено</td></tr>';
  }
  $('#o-status').innerHTML += STATUSES.map((s, i) => `<option value="${i}">${s}</option>`).join('');
  $('#o-search').addEventListener('input', renderOrders);
  $('#o-status').addEventListener('change', renderOrders);
  renderOrders();

  // Детали брони
  function openOrder(id) {
    const o = orders.find((x) => x.id === id); if (!o) return;
    $('#dr-body').innerHTML = `<h2 id="dr-title">Бронь ${o.id}</h2>${badge(o.st)}
      <ol class="flow">${STATUSES.map((s, i) => `<li class="${i <= o.st ? 'done' : ''}">${s}</li>`).join('')}</ol>
      <div class="kv"><span>Гости</span><b>${esc(o.g.join(', '))}</b></div>
      <div class="kv"><span>Студия</span><b>${esc(o.apt)}</b></div>
      <div class="kv"><span>Даты</span><b>${o.from}–${o.to} · ${o.n} ноч.</b></div>
      <div class="kv"><span>Автор заявки</span><b>${esc(o.by)}</b></div>
      <div class="kv"><span>Сумма</span><b>${sum}</b></div>
      <h3>Инструкция по заселению</h3><p class="ph">[Код замка и инструкция придут гостю перед заездом — текст от владельца]</p>
      <h3>Документы брони</h3>
      <ul class="plain">${o.st >= 4 ? `<li>Счёт № С-${o.id.slice(2)} <span class="dl" aria-disabled="true"><svg class="i" width="18" height="18" aria-hidden="true"><use href="#i-download"/></svg></span></li><li>Акт № А-${o.id.slice(2)} <span class="dl" aria-disabled="true"><svg class="i" width="18" height="18" aria-hidden="true"><use href="#i-download"/></svg></span></li>` : '<li class="muted">Появятся после выезда</li>'}</ul>
      <div class="btns"><button class="kb-btn" type="button" data-toast="Демо: запрос на продление отправлен менеджеру">Продлить</button><button class="kb-btn ghost" type="button" data-toast="Демо: запрос на отмену отправлен менеджеру">Отменить</button></div>`;
    openLayer('#drawer');
  }
  $('#orders-body').addEventListener('click', (e) => { const r = e.target.closest('tr[data-id]'); if (r) openOrder(r.dataset.id); });
  $('#orders-body').addEventListener('keydown', (e) => { const r = e.target.closest('tr[data-id]'); if (r && e.key === 'Enter') openOrder(r.dataset.id); });

  // Сотрудники
  function renderStaff() {
    const q = $('#s-search').value.trim().toLowerCase();
    $('#staff-body').innerHTML = staff.filter((s) => !q || (s.n + s.ph + s.em).toLowerCase().includes(q)).map((s) =>
      `<tr><td data-label="ФИО"><b>${esc(s.n)}</b></td><td data-label="Телефон">${s.ph}</td><td data-label="E-mail">${s.em}</td><td data-label="Отдел">${esc(s.dep)}</td><td data-label="Роль">${esc(s.role)}</td><td data-label="Статус">${esc(s.st)}</td></tr>`).join('');
  }
  $('#s-search').addEventListener('input', renderStaff); renderStaff();

  // Финансы
  const ops = [['21.10', 'Д-1004', 'Начисление'], ['25.10', 'Д-1004', 'Оплата'], ['03.11', 'Д-1012', 'Начисление'], ['07.11', 'Д-1012', 'Оплата'], ['09.11', 'Д-0998', 'Возврат']];
  $('#fin-body').innerHTML = ops.map((o) => `<tr><td data-label="Дата">${o[0]}</td><td data-label="№ брони">${o[1]}</td><td data-label="Операция">${o[2]}</td><td data-label="Сумма">${sum}</td><td data-label="Остаток">${sum}</td></tr>`).join('');
  const nights = [['Авг', 6], ['Сен', 11], ['Окт', 14], ['Ноя', 9]];
  const mx = Math.max(...nights.map((x) => x[1]));
  $('#ch-nights').innerHTML = nights.map(([m, v]) => `<div class="bcol"><div class="b" style="height:${Math.round(v / mx * 100)}%"><span>${v}</span></div><small>${m}</small></div>`).join('');
  const deps = [['Производственный', 55, 'var(--teal)'], ['Снабжение', 30, 'var(--orange)'], ['Администрация', 15, 'var(--dark)']];
  let acc = 0;
  const arcs = deps.map(([, p, c]) => { const s = `<circle r="15.9" cx="20" cy="20" fill="none" stroke="${c}" stroke-width="7" stroke-dasharray="${p} ${100 - p}" stroke-dashoffset="${25 - acc}"></circle>`; acc += p; return s; }).join('');
  $('#ch-deps').innerHTML = `<div class="donut"><svg viewBox="0 0 40 40" width="140" height="140" role="img" aria-label="Доли расходов по отделам, демо">${arcs}</svg><ul class="plain">${deps.map(([n, p, c]) => `<li><i style="background:${c}"></i>${n} — ${p}%</li>`).join('')}</ul></div>`;

  // Документы
  $$('tbody[data-docs]').forEach((tb) => {
    const t = tb.dataset.docs, pre = t[0];
    tb.innerHTML = orders.filter((o) => o.st >= 3).map((o, i) => `<tr><td data-label="Документ"><b>${t} № ${pre}-${o.id.slice(2)}</b></td><td data-label="Дата">${o.to}.2026</td><td data-label="Бронь">${o.id}</td><td data-label="Сумма">${sum}</td><td data-label=""><span class="dl" aria-disabled="true" title="Демо: скачивание отключено"><svg class="i" width="18" height="18" aria-hidden="true"><use href="#i-download"/></svg></span></td></tr>`).join('');
  });

  // Вкладки
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.tabs [data-tab]'); if (!b) return;
    const g = b.closest('.tabs');
    $$('[data-tab]', g).forEach((x) => { x.setAttribute('aria-selected', String(x === b)); $('#' + x.dataset.tab).hidden = x !== b; });
  });

  // Модалка и шторка
  function openLayer(sel) { const el = $(sel); el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); }
  function closeLayers() { $$('.drawer,.modal').forEach((el) => { el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); }); }
  $('#bk-staff').innerHTML = staff.filter((s) => s.st !== 'Отключён').map((s) => `<option>${esc(s.n)}</option>`).join('');
  fetch((window.SH_BASE||'/')+'data/apartments.json?v=1794947760').then((r) => r.json()).then((j) => {
    $('#bk-apt').innerHTML += j.apartments.filter((a) => a.district !== 'TODO').map((a) => `<option value="${a.id}">${esc(a.title)}</option>`).join('');
  }).catch(() => {});
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { $('#bk-title').textContent = o.dataset.group ? 'Групповая заявка' : 'Забронировать студию'; openLayer('#' + o.dataset.open); return; }
    if (e.target.closest('[data-close]') || e.target.classList.contains('drawer') || e.target.classList.contains('modal')) { closeLayers(); return; }
    const t = e.target.closest('[data-toast]'); if (t) toast(t.dataset.toast);
    if (e.target.id === 'switch-co') toast('Демо: выбор из компаний, к которым у вас есть доступ');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLayers(); });
  $('#book-form').addEventListener('submit', (e) => { e.preventDefault(); closeLayers(); e.target.reset(); toast('Заявка отправлена менеджеру (демо)'); });

  // Демо-открытие по hash: #orders/Д-1021
  const m = decodeURIComponent(location.hash).match(/^#orders\/(.+)$/);
  show();
  if (m) openOrder(m[1]);
})();
