/* Общий JS: меню, формы, каталог, карты. Без зависимостей. */
(function () {
  'use strict';
  // Адрес обработчика заявок. Пока пусто — формы в демо-режиме и ничего не отправляют.
  // Пример после настройки хостинга: const FORM_ENDPOINT = '/api/lead.php';
  const FORM_ENDPOINT = '';
  // Ключ JS API Яндекс Карт. Пока пусто — вместо карты показывается список адресов.
  // <!-- TODO: YANDEX_MAPS_API_KEY -->
  const YMAPS_KEY = '';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Мобильное меню
  const mb = $('.menu-btn');
  if (mb) mb.addEventListener('click', () => {
    const n = $('header nav'); n.classList.toggle('open');
    mb.setAttribute('aria-expanded', n.classList.contains('open'));
  });

  // Переключатели-«пилюли» -> скрытое поле формы
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.pills button'); if (!b) return;
    const g = b.closest('.pills');
    $$('button', g).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const f = g.closest('form');
    const h = f && g.dataset.field && f.querySelector('input[name="' + g.dataset.field + '"]');
    if (h) h.value = (g.dataset.prefix || '') + b.textContent.trim();
  });

  // Единый обработчик всех форм заявок
  function validate(f) {
    const el = f.elements;
    const phone = el.phone ? el.phone.value.replace(/\D/g, '') : '';
    const email = el.email ? el.email.value.trim() : '';
    if (!phone && !email) return 'Укажите телефон или e-mail.';
    if (phone && phone.length < 10) return 'Проверьте номер телефона.';
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Проверьте e-mail.';
    if (el.consent && !el.consent.checked) return 'Нужно согласие на обработку персональных данных.';
    return '';
  }
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('form.js-lead'); if (!f) return;
    e.preventDefault();
    const err = $('.err', f), ok = $('.ok', f);
    const msg = validate(f);
    if (err) { err.textContent = msg; err.style.display = msg ? 'block' : 'none'; }
    if (msg) { if (ok) ok.style.display = 'none'; return; }
    const data = Object.fromEntries(new FormData(f).entries());
    data.page = location.pathname; data.form = f.dataset.form || 'lead';
    if (!FORM_ENDPOINT) {
      ok.textContent = 'Демо-режим: заявка никуда не отправлена (FORM_ENDPOINT не подключён).';
      ok.style.display = 'block'; return;
    }
    try {
      const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error(String(r.status));
      ok.textContent = 'Спасибо! Менеджер свяжется с вами в рабочее время.'; ok.style.display = 'block'; f.reset();
      // TODO: цель Яндекс Метрики: ym(COUNTER_ID, 'reachGoal', 'lead')
    } catch (x) {
      if (err) { err.textContent = 'Не удалось отправить. Позвоните нам или попробуйте позже.'; err.style.display = 'block'; }
    }
  });

  // Данные о студиях
  let aptsP = null;
  const loadApts = () => aptsP || (aptsP = fetch((window.SH_BASE||'/')+'data/apartments.json').then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((j) => j.apartments));

  // Карта: Яндекс Карты при наличии ключа, иначе статичный список адресов
  function renderMap(el, apts) {
    const pts = apts.filter((a) => a.lat && a.lng);
    const list = el.parentNode.querySelector('.addr-list');
    if (list) list.innerHTML = pts.map((a) => '<li><strong>' + esc(a.address) + '</strong><br><small>' + esc(a.district) + ' район</small></li>').join('');
    if (!YMAPS_KEY) {
      el.innerHTML = '<div class="ph mapph" style="height:100%;margin:0">Интерактивная карта появится после подключения ключа Яндекс Карт.<br>Адреса студий — в списке.</div>';
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=' + encodeURIComponent(YMAPS_KEY);
    s.onload = () => window.ymaps.ready(() => {
      el.innerHTML = '';
      const m = new window.ymaps.Map(el, { center: [52.266, 104.33], zoom: 12, controls: ['zoomControl'] });
      pts.forEach((a) => m.geoObjects.add(new window.ymaps.Placemark([a.lat, a.lng], { hintContent: a.address, balloonContent: esc(a.title) }, { preset: 'islands#orangeDotIcon' })));
      m.geoObjects.add(new window.ymaps.Placemark([52.2668, 104.3755], { hintContent: 'Аэропорт Иркутск' }, { preset: 'islands#blueAirportIcon' }));
    });
    document.head.appendChild(s);
  }
  $$('.js-map').forEach((el) => loadApts().then((a) => renderMap(el, a)).catch(() => { el.textContent = 'Не удалось загрузить адреса.'; }));

  // Каталог
  const cat = $('#catalog');
  if (cat) {
    const tpl = $('#apt-form-tpl');
    const card = (a) => {
      const img = a.photos && a.photos[0]
        ? '<img src="' + esc((window.SH_BASE||'/')+a.photos[0]) + '" alt="' + esc(a.title) + ': интерьер студии" loading="lazy" width="400" height="300">'
        : '<div class="ph noimg">Фото — добавить</div>';
      const badges = [a.near_airport ? 'У аэропорта' : '', a.beds === 2 ? '2 кровати' : '', a.district && a.district !== 'TODO' ? a.district + ' район' : '']
        .filter(Boolean).map((b) => '<span class="badge">' + esc(b) + '</span>').join('') +
        (a.todo ? '<span class="badge todo">' + esc(a.status) + '</span>' : '');
      const meta = a.district === 'TODO'
        ? '<p class="ph">Данные студии ещё не внесены.</p>'
        : '<p>' + esc(a.address) + '<br>Площадь: ' + esc(a.area) + ' м² · Кровати: ' + esc(a.beds) +
          '<br>До аэропорта: ' + esc(a.airport_minutes || 'уточнить') + '</p><p style="color:var(--muted);font-size:14px">' + esc(a.features.join(' · ')) + '</p>';
      return '<article class="card apt" data-airport="' + (a.near_airport ? 1 : 0) + '" data-beds="' + esc(a.beds) + '" data-district="' + esc(a.district) + '">' +
        img + '<div>' + badges + '</div><h3>' + esc(a.title) + '</h3>' + meta +
        '<details><summary>Запросить эту студию</summary><div class="slot" data-id="' + esc(a.id) + '"></div></details></article>';
    };
    loadApts().then((apts) => {
      cat.innerHTML = apts.map(card).join('');
      $$('.slot', cat).forEach((s) => {
        const f = tpl.content.firstElementChild.cloneNode(true);
        f.elements.apartment_id.value = s.dataset.id; s.appendChild(f);
      });
      const apply = () => {
        const air = $('#f-air').checked, two = $('#f-two').checked, d = $('#f-district').value;
        let n = 0;
        $$('.apt', cat).forEach((c) => {
          const show = (!air || c.dataset.airport === '1') && (!two || c.dataset.beds === '2') && (!d || c.dataset.district === d);
          c.hidden = !show; if (show) n++;
        });
        $('#f-count').textContent = n ? 'Показано: ' + n : 'По этим фильтрам пока нет подтверждённых студий: данные уточняются. Оставьте общую заявку — подберём вручную.';
      };
      $$('#filters input, #filters select').forEach((i) => i.addEventListener('change', apply));
      apply();
    }).catch(() => { cat.innerHTML = '<p class="ph">Не удалось загрузить каталог (data/apartments.json).</p>'; });
  }
})();
