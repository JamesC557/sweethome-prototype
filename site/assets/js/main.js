/* Общий JS: меню, формы, каталог, карты. Без зависимостей. */
(function () {
  'use strict';
  // Адрес обработчика заявок: веб-приложение Google Apps Script CRM (тестовый этап).
  // При переезде на свой хостинг заменить на '/api/lead.php'.
  const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw-W6cjGuZ9NQsAihINh9p7gFFg-ZYCxyP4hobcG9BIkqneks9nVCiLpGBMf6mNbrOn/exec';
  // Код клиента из персональной ссылки менеджера: ?client=К-001 (запоминается на время визита)
  const CLIENT = (function () {
    let c = '';
    try { c = new URLSearchParams(location.search).get('client') || sessionStorage.getItem('sh_client') || ''; if (c) sessionStorage.setItem('sh_client', c); } catch (x) {}
    return c.trim();
  })();
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

  // Скрытое поле-ловушка для ботов (люди его не видят и не заполняют)
  function addTrap(f) {
    if (f.querySelector('input[name="website"]')) return;
    const t = document.createElement('input');
    t.type = 'text'; t.name = 'website'; t.tabIndex = -1; t.autocomplete = 'off'; t.setAttribute('aria-hidden', 'true');
    t.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    f.appendChild(t);
  }
  $$('form.js-lead').forEach(addTrap);
  new MutationObserver(() => $$('form.js-lead').forEach(addTrap)).observe(document.body, { childList: true, subtree: true });

  const T0 = Date.now(); // время загрузки страницы (проверка «слишком быстро»)
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
    data.page = location.pathname; data.t = Date.now() - T0; data.form = f.dataset.form || 'lead';
    if (CLIENT) data.client = CLIENT;
    if (!FORM_ENDPOINT) {
      ok.textContent = 'Демо-режим: заявка никуда не отправлена (FORM_ENDPOINT не подключён).';
      ok.style.display = 'block'; return;
    }
    const btn = $('button[type="submit"]', f); if (btn) btn.disabled = true;
    try {
      // text/plain — чтобы браузер не делал предварительный CORS-запрос к Google
      const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || String(r.status));
      ok.textContent = f.dataset.form === 'callback' ? 'Спасибо! Перезвоним в течение 15 минут.' : 'Спасибо! Заявка ' + (j.id || '') + ' принята. Перезвоним в течение 15 минут и пришлём цену на ваши даты.';
      ok.style.display = 'block'; if (err) err.style.display = 'none'; f.reset();
      // TODO: цель Яндекс Метрики: ym(COUNTER_ID, 'reachGoal', 'lead')
    } catch (x) {
      if (err) { err.textContent = (x && x.message && !/^\d+$/.test(x.message) && x.message !== 'Failed to fetch' ? x.message + '. ' : '') + 'Не удалось отправить. Позвоните нам или попробуйте позже.'; err.style.display = 'block'; }
    } finally { if (btn) btn.disabled = false; }
  });

  // Данные о студиях
  const BASE = window.SH_BASE || '/';
  const url = (p) => BASE + String(p).replace(/^\//, '');
  let aptsP = null;
  const loadApts = () => aptsP || (aptsP = fetch((window.SH_BASE||'/')+'data/apartments.json?v=1795634064').then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((j) => j.apartments));
  const ic = (id, s) => '<svg class="i" width="' + (s || 18) + '" height="' + (s || 18) + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>';
  // Группировка студий по домам (адресам)
  const byAddress = (apts) => {
    const m = new Map();
    apts.forEach((a) => { if (!m.has(a.address)) m.set(a.address, []); m.get(a.address).push(a); });
    return Array.from(m.entries()).map(([address, list]) => ({ address, list, a: list[0] }));
  };
  const plural = (n) => n % 10 === 1 && n % 100 !== 11 ? 'студия' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'студии' : 'студий');

  // Карта: Яндекс Карты (JS API 2.1). Ключ YMAPS_KEY — вписать из кабинета разработчика Яндекса;
  // без ключа API тоже загружается, но для боевого сайта ключ обязателен по условиям Яндекса.
  // Координаты домов — lat/lng в data/apartments.json; если их нет, адрес геокодируется (нужен ключ).
  // window.shMap.show(address) — открыть дом на карте (кнопка «Показать на карте» в карточке).
  const marks = {};
  let mapReady = null;
  function renderMap(el, apts) {
    const houses = byAddress(apts);
    mapReady = new Promise((done) => {
      const s = document.createElement('script');
      s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU' + (YMAPS_KEY ? '&apikey=' + encodeURIComponent(YMAPS_KEY) : '');
      s.onerror = () => { el.hidden = true; const sec = el.closest('.map-sec'); if (sec) sec.hidden = true; };
      s.onload = () => window.ymaps.ready(() => {
        el.innerHTML = '';
        const m = new window.ymaps.Map(el, { center: [52.28, 104.32], zoom: 12, controls: ['zoomControl', 'fullscreenControl'] }, { suppressMapOpenBlock: true });
        m.behaviors.disable('scrollZoom');
        const add = (h, coords) => {
          const body = h.list.map((a) => '<a href="#' + esc(a.id) + '">' + esc(a.name) + '</a>' + (a.beds === 'separate' ? ' — две раздельные кровати' : '')).join('<br>');
          const pm = new window.ymaps.Placemark(coords, {
            hintContent: h.address, iconCaption: h.address,
            balloonContentHeader: esc(h.address) + (h.a.complex ? ' · ЖК «' + esc(h.a.complex) + '»' : ''),
            balloonContentBody: body,
          }, { preset: 'islands#yellowDotIconWithCaption' });
          marks[h.address] = pm; m.geoObjects.add(pm);
        };
        Promise.all(houses.map((h) => (h.a.lat && h.a.lng)
          ? (add(h, [h.a.lat, h.a.lng]), null)
          : window.ymaps.geocode(h.a.address_full || ('Иркутск, ' + h.address), { results: 1 }).then((r) => { const g = r.geoObjects.get(0); if (g) add(h, g.geometry.getCoordinates()); }).catch(() => {})
        )).then(() => { const b = m.geoObjects.getBounds(); if (houses.length === 1 && marks[houses[0].address]) m.setCenter(marks[houses[0].address].geometry.getCoordinates(), 15); else if (b) m.setBounds(b, { checkZoomRange: true, zoomMargin: 40 }); done(m); });
      });
      document.head.appendChild(s);
    });
  }
  window.shMap = {
    show(address) {
      const el = $('.js-map'); if (!el || !mapReady) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mapReady.then((m) => { const pm = marks[address]; if (!pm) return; m.setCenter(pm.geometry.getCoordinates(), 15, { duration: 300 }).then(() => pm.balloon.open()); });
    },
  };
  $$('.js-map').forEach((el) => loadApts().then((a) => renderMap(el, el.dataset.address ? a.filter((x) => x.address === el.dataset.address) : a)).catch(() => { el.hidden = true; }));

  // Каталог
  const cat = $('#catalog');
  if (cat) {
    const tpl = $('#apt-form-tpl');
    // Свойства карточки: выводим только то, что есть в данных (пустые поля не показываем)
    const props = (a) => {
      const p = [];
      p.push(['map-pin', a.address + (a.district ? ', ' + a.district + ' р-н' : '')]);
      if (a.complex) p.push(['house', 'ЖК «' + a.complex + '»']);
      if (a.beds === 'separate') p.push(['bed-double', 'Две раздельные кровати']);
      if (a.beds === 'double') p.push(['bed-double', 'Двуспальная кровать']);
      if (a.capacity) p.push(['users', 'До ' + a.capacity + ' гостей']);
      if (a.area) p.push(['house', a.area + ' м²']);
      if (a.floor) p.push(['house', a.floor + ' этаж' + (a.elevator === true ? ', лифт' : a.elevator === false ? ', без лифта' : '')]);
      if (a.kitchen) p.push(['check', 'Кухня' + (a.appliances && a.appliances.length ? ': ' + a.appliances.join(', ') : '')]);
      if (a.washer) p.push(['washer', 'Стиральная машина']);
      if (a.wifi) p.push(['check', 'Wi‑Fi']);
      if (a.parking) p.push(['check', 'Парковка: ' + a.parking]);
      if (a.near && a.near.length) p.push(['search', 'Пешком: ' + a.near.join(', ')]);
      if (a.near_car && a.near_car.length) p.push(['search', '~10 минут на машине: ' + a.near_car.join(', ')]);
      if (a.to_airport) p.push(['airplane', a.to_airport === 'шаговая доступность' ? 'Аэропорт в шаговой доступности' : a.to_airport === '500 м' ? '500 метров до аэропорта' : 'Аэропорт: ' + a.to_airport]);
      return '<ul class="props">' + p.map(([i, t]) => '<li>' + ic(i) + '<span>' + esc(t) + '</span></li>').join('') + '</ul>';
    };
    const gallery = (a) => {
      const ph = a.photos || [];
      if (!ph.length) return '<div class="ph noimg">Фото — добавить</div>';
      return '<div class="gal" data-n="' + ph.length + '"><div class="gal-track" tabindex="0" aria-label="Фото студии ' + esc(a.code) + '">' +
        ph.map((p, i) => '<img src="' + esc(url(p)) + '" alt="' + esc(a.name + ', ' + a.address + ' — фото ' + (i + 1)) + '" loading="lazy" decoding="async" width="1600" height="1200">').join('') +
        '</div>' + (ph.length > 1 ? '<button type="button" class="gal-btn prev" aria-label="Предыдущее фото">' + ic('chevron-down') + '</button><button type="button" class="gal-btn next" aria-label="Следующее фото">' + ic('chevron-down') + '</button>' : '') +
        '<span class="gal-count">1 / ' + ph.length + '</span></div>';
    };
    const card = (a) => '<article class="card apt" id="' + esc(a.id) + '" data-district="' + esc(a.district || '') + '" data-address="' + esc(a.address) + '" data-beds="' + esc(a.beds || '') + '" data-near="' + esc((a.near || []).concat(a.near_car || []).join('|')) + '">' +
      gallery(a) +
      '<div class="apt-head"><h3><a href="' + esc(url('catalog/' + a.id + '/')) + '">' + esc(a.name) + '</a></h3>' + (a.code ? '<span class="art" title="Артикул студии — назовите его менеджеру">' + esc(a.code) + '</span>' : '') + '</div>' +
      props(a) +
      '<div class="apt-links">' + '<button type="button" class="apt-map" data-address="' + esc(a.address) + '">' + ic('map-pin', 16) + 'Показать на карте</button></div>' +
      '<div class="apt-price"><span class="apt-price-l">Цена на ваши даты</span><span class="apt-price-v">пришлём за 15 минут</span></div>' +
      '<div class="apt-actions"><a class="btn btn-sm btn-outline" href="' + esc(url('catalog/' + a.id + '/')) + '">Подробнее</a><button type="button" class="btn btn-sm apt-cta" aria-expanded="false" aria-controls="f-' + esc(a.id) + '">Узнать цену</button></div>' +
      '<div class="slot" id="f-' + esc(a.id) + '" data-id="' + esc(a.id) + '" hidden></div></article>';

    loadApts().then((apts) => {
      cat.innerHTML = apts.map(card).join('');
      // Галерея: прокрутка со snap, кнопки и счётчик
      $$('.gal', cat).forEach((g) => {
        const t = $('.gal-track', g), n = +g.dataset.n, c = $('.gal-count', g);
        const idx = () => Math.round(t.scrollLeft / t.clientWidth);
        t.addEventListener('scroll', () => { c.textContent = (idx() + 1) + ' / ' + n; }, { passive: true });
        g.addEventListener('click', (e) => {
          const b = e.target.closest('.gal-btn'); if (!b) return;
          const i = (idx() + (b.classList.contains('next') ? 1 : -1) + n) % n;
          t.scrollTo({ left: i * t.clientWidth, behavior: 'smooth' });
        });
      });
      // Заявка на конкретную студию: форма с apartment_id
      cat.addEventListener('click', (e) => {
        const mb = e.target.closest('.apt-map'); if (mb) { window.shMap.show(mb.dataset.address); return; }
        const b = e.target.closest('.apt-cta'); if (!b) return;
        const s = b.closest('.apt').querySelector('.slot');
        if (!s.firstElementChild) {
          const f = tpl.content.firstElementChild.cloneNode(true);
          f.elements.apartment_id.value = s.dataset.id;
          const a = apts.find((x) => x.id === s.dataset.id);
          if (a && f.elements.extra) f.elements.extra.value = a.code + ' · ' + a.name + ', ' + a.address;
          s.appendChild(f);
        }
        s.hidden = !s.hidden; b.setAttribute('aria-expanded', String(!s.hidden));
        if (!s.hidden) { const i = s.querySelector('input[name="name"]'); if (i) i.focus({ preventScroll: true }); }
      });

      const fd = $('#f-district'), fa = $('#f-address'), fb = $('#f-beds'), fn = $('#f-near');
      const apply = () => {
        const d = fd ? fd.value : '', bd = fb.value, nr = fn ? fn.value : '';
        let n = 0;
        $$('.apt', cat).forEach((c) => {
          const show = (!d || c.dataset.district === d) && (!fa.value || c.dataset.address === fa.value) &&
            (!bd || (bd === 'double' ? c.dataset.beds !== 'separate' : c.dataset.beds === bd)) && (!nr || nr.split('|').some((x) => c.dataset.near.split('|').includes(x)));
          c.hidden = !show; if (show) n++;
        });
        $('#f-count').textContent = n ? 'Найдено: ' + n + ' ' + plural(n) : 'По этим фильтрам студий нет. Оставьте общую заявку — подберём вручную.';
        $$('.addr-btn').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.address === fa.value)));
      };
      [fd, fa, fb, fn].filter(Boolean).forEach((i) => i.addEventListener('change', apply));
      $('#f-reset').addEventListener('click', () => { if (fd) fd.value = ''; if (fn) fn.value = ''; fa.value = fb.value = ''; apply(); });
      // Клик по адресу в блоке карты — фильтр по дому
      document.addEventListener('click', (e) => {
        const b = e.target.closest('.addr-btn'); if (!b) return;
        if (fd) fd.value = ''; fa.value = b.dataset.address; apply();
        $('#filters').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      apply();
    }).catch(() => { cat.innerHTML = '<p class="ph">Не удалось загрузить каталог (data/apartments.json).</p>'; });
  }
})();
