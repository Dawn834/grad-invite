/* ═══════════════════════════════════════════════
   Thiệp mời tốt nghiệp — Dawn (Đức)
   Vanilla JS, không dependency. State duy nhất: guestName.
   ═══════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ── CONFIG — sửa ở đây, không đụng vào phần dưới ───────────── */
  const CONFIG = {
    // Mốc so tuổi để chọn xưng hô trong thư. Khách sinh trước  → xưng "em";
    // sinh sau → xưng "anh"; cùng năm → xưng "mình".
    owner: { name: 'Đức', birthYear: 2004 },

    venue:   'Học viện Công nghệ Bưu chính Viễn thông',
    // Hàng ĐỊA CHỈ luôn hiện, nên field này đừng để trống.
    // Chỉ dùng để hiển thị và ghi vào file .ics — nút Chỉ đường đi theo
    // mapCoords bên dưới, nên hai giá trị này phải cùng một cơ sở.
    address: 'Km10 Nguyễn Trãi, Hà Đông, Hà Nội',

    // Toạ độ cơ sở tổ chức lễ, lấy từ link Google Maps:
    //   https://maps.app.goo.gl/5iR78X4Rr4bwZF1N6  (PTIT Hà Đông)
    // Chỉ đường bằng toạ độ chính xác hơn tra theo tên, vì PTIT có 2 cơ sở
    // và Maps hay trả về nhầm cơ sở Cầu Giấy. Để '' thì quay về tra theo tên.
    mapCoords: '20.980913,105.7874165',

    // Chỗ gửi xe gần trường. Mỗi mục thành một nút mở thẳng Google Maps.
    // Mảng rỗng thì hàng GỬI XE tự ẩn.
    parking: {
      lead: 'Có thể gửi xe tại:',
      places: [
        { name: 'Hồ Gươm Plaza',        url: 'https://maps.app.goo.gl/e4G7nU3UjNV92YCw5' },
        { name: 'Siêu thị Nguyễn Kim',  url: 'https://maps.app.goo.gl/9X7qKtfutyqTAW5N6' },
      ],
    },

    event: {
      title: 'Lễ tốt nghiệp của Đức',
      date:  'Thứ Bảy, 26/09/2026',

      // Hai khung giờ để khách chọn khung nào tiện. Thêm/bớt phần tử là
      // thẻ Thông tin tự cập nhật, không phải đụng vào HTML.
      slots: [
        { label: 'Đầu lễ',  time: '7:30 – 9:00 sáng' },
        { label: 'Cuối lễ', time: '11:30 sáng' },
      ],

      // Ghi chú dưới hai khung giờ. Để '' thì dòng này tự ẩn.
      // Viết trung tính, không đại từ — vì render trước khi biết năm sinh khách.
      note: 'Hai khung giờ này là lúc dễ gặp nhau nhất — ghé lúc nào cũng được.',

      // File .ics chỉ chứa 1 sự kiện nên phải bao trọn cả hai khung.
      // Giờ địa phương Việt Nam (UTC+7) → trừ 7 tiếng ra giờ UTC.
      startUtc: '20260926T003000Z',   // 07:30 ICT
      endUtc:   '20260926T050000Z',   // 12:00 ICT
    },

    timeline: [
      { time: '07:30', desc: 'Bắt đầu buổi lễ trao bằng chính thức' },
      { time: '11:30', desc: 'Kết thúc buổi lễ, Chụp ảnh check-in' },
      // { time: '11:30', desc: 'Tiệc nhẹ / Ăn trưa cùng gia đình & bạn bè' },
    ],

    audio: { volume: 0.35, fadeMs: 1500 },

    // Thời gian mỗi ảnh hero đứng yên trước khi chuyển (ms).
    // Thời lượng crossfade nằm ở .hero__slide { transition } trong style.css.
    heroSlideMs: 3000,
  };

  const NAME_MAX = 40;
  const YEAR_MIN = 1940;
  const YEAR_MAX = new Date().getFullYear();
  const KEY_GUEST = 'guestName';
  const KEY_YEAR  = 'guestYear';
  const KEY_MUTED = 'bgmMuted';

  /* ── Helpers ────────────────────────────────────────────────── */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** trim + gộp khoảng trắng thừa. Giữ nguyên hoa/thường người dùng nhập. */
  const normalizeName = (raw) => String(raw || '').replace(/\s+/g, ' ').trim();

  const isValidName = (name) => name.length >= 1 && name.length <= NAME_MAX;

  /** '2004' → 2004. Rác / rỗng / ngoài khoảng → 0. */
  const normalizeYear = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length !== 4) return 0;
    const y = Number(digits);
    return y >= YEAR_MIN && y <= YEAR_MAX ? y : 0;
  };

  /** Xưng hô ngôi 1 của Đức, suy từ năm sinh khách. Không có năm → null. */
  const pronounFor = (year) => {
    if (!year) return null;
    const mine = CONFIG.owner.birthYear;
    if (year < mine) return { low: 'em',   cap: 'Em'   };  // khách lớn tuổi hơn
    if (year > mine) return { low: 'anh',  cap: 'Anh'  };  // khách nhỏ tuổi hơn
    return { low: 'mình', cap: 'Mình' };                   // bằng tuổi
  };

  const store = {
    get(key, area = sessionStorage) {
      try { return area.getItem(key); } catch { return null; }
    },
    set(key, val, area = sessionStorage) {
      try { area.setItem(key, val); } catch { /* private mode */ }
    },
    del(key, area = sessionStorage) {
      try { area.removeItem(key); } catch { /* noop */ }
    },
  };

  /* ── DOM refs ───────────────────────────────────────────────── */
  const gate      = $('#gate');
  const gateForm  = $('#gate-form');
  const gateInput = $('#guest-input');
  const yearInput = $('#year-input');
  const gateError = $('#gate-error');
  const card      = $('#card');
  const bgm       = $('#bgm');
  const audioBtn  = $('#audio-toggle');

  /* ── Render tên khách — CHỈ qua textContent (chống XSS) ─────── */
  function renderName(name) {
    $$('[data-name]').forEach((el) => { el.textContent = name; });
    document.title = `Thiệp mời tốt nghiệp — gửi ${name}`;
  }

  // Giữ lại text mặc định trong HTML để khôi phục khi khách không điền năm sinh.
  const selfSlots = $$('[data-self]');
  selfSlots.forEach((el) => { el.dataset.selfDefault = el.textContent; });

  /** Thay ngôi 1 trong thư. Cũng CHỈ dùng textContent. */
  function renderPronoun(year) {
    const p = pronounFor(year);
    selfSlots.forEach((el) => {
      el.textContent = p ? p[el.dataset.self] : el.dataset.selfDefault;
    });
  }

  /* ── Render phần phụ thuộc CONFIG ───────────────────────────── */
  /** Dòng dẫn + mỗi chỗ gửi xe một nút mở Google Maps ở tab mới. */
  function renderParking() {
    const dd  = $('#info-parking');
    const row = dd.closest('.info__row');
    const places = CONFIG.parking?.places ?? [];

    if (!places.length) { row.hidden = true; return; }
    dd.textContent = '';

    const lead = document.createElement('p');
    lead.className = 'info__parking-lead';
    lead.textContent = CONFIG.parking.lead;
    dd.append(lead);

    const wrap = document.createElement('div');
    wrap.className = 'info__parking-links';

    places.forEach((place) => {
      const a = document.createElement('a');
      a.className = 'btn btn--ghost btn--sm';
      a.href = place.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = place.name;
      wrap.append(a);
    });

    dd.append(wrap);
  }

  /** Ngày trên một dòng, mỗi khung giờ một dòng nhãn + giờ bên dưới. */
  function renderEventTime() {
    const dd = $('#info-time');
    dd.textContent = '';

    const date = document.createElement('span');
    date.className = 'info__date';
    date.textContent = CONFIG.event.date;
    dd.append(date);

    if (!CONFIG.event.slots?.length) return;

    const ul = document.createElement('ul');
    ul.className = 'info__slots';

    CONFIG.event.slots.forEach((slot) => {
      const li = document.createElement('li');
      li.className = 'info__slot';

      const label = document.createElement('span');
      label.className = 'info__slot-label';
      label.textContent = slot.label;

      const time = document.createElement('span');
      time.className = 'info__slot-time';
      time.textContent = slot.time;

      li.append(label, time);
      ul.append(li);
    });

    dd.append(ul);

    if (!CONFIG.event.note) return;
    const note = document.createElement('p');
    note.className = 'info__note';
    note.textContent = CONFIG.event.note;
    dd.append(note);
  }

  function renderStaticContent() {
    renderEventTime();
    $('#info-venue').textContent   = CONFIG.venue;
    $('#info-address').textContent = CONFIG.address;
    renderParking();

    // Chỉ đường: ưu tiên toạ độ (không nhầm cơ sở), không có thì tra theo tên.
    const destination = CONFIG.mapCoords
      || [CONFIG.venue, CONFIG.address].filter(Boolean).join(', ');
    $('#btn-directions').href =
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

    const list = $('#timeline-list');
    CONFIG.timeline.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'timeline__item reveal';

      const time = document.createElement('span');
      time.className = 'timeline__time';
      time.textContent = item.time;

      const desc = document.createElement('span');
      desc.className = 'timeline__desc';
      desc.textContent = item.desc;

      li.append(time, desc);
      list.append(li);
    });
  }

  /* ── Reveal on scroll ───────────────────────────────────────── */
  function initReveal() {
    const targets = $$('.reveal');

    if (reducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('is-visible'), i * 80);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.2 });

    targets.forEach((el) => io.observe(el));
  }

  /* ── Slideshow ảnh hero ─────────────────────────────────────── */
  const heroSlider = {
    slides: [],
    index: 0,
    timer: 0,
    ready: false,

    /** Gọi được nhiều lần (khách bấm "Nhập lại tên" rồi mở thiệp lại). */
    init() {
      if (this.ready) { this.play(); return; }

      this.slides = $$('.hero__slide');
      if (this.slides.length < 2) return;            // 1 ảnh thì không có gì để chuyển

      this.ready = true;
      document.addEventListener('visibilitychange', () => {
        document.hidden ? this.pause() : this.play();
      });
      this.play();
    },

    play() {
      // Khách bật "giảm chuyển động" → giữ ảnh đầu, không tự chạy.
      // card.hidden: đang ở Màn 1, không chạy timer vô ích.
      if (!this.ready || this.timer || card.hidden || reducedMotion()) return;
      this.timer = setInterval(() => this.next(), CONFIG.heroSlideMs);
    },

    pause() {
      clearInterval(this.timer);
      this.timer = 0;
    },

    next() {
      this.slides[this.index].classList.remove('is-active');
      this.index = (this.index + 1) % this.slides.length;
      this.slides[this.index].classList.add('is-active');
    },
  };

  /* ── Nhạc nền ───────────────────────────────────────────────── */
  const audio = {
    available: false,

    /** Chưa có assets/audio/bgm.mp3 → nút toggle không bao giờ hiện. */
    async probe() {
      if (!bgm) return false;
      try {
        const res = await fetch(bgm.getAttribute('src'), { method: 'HEAD' });
        this.available = res.ok;
      } catch {
        this.available = false;
      }
      return this.available;
    },

    get muted() { return store.get(KEY_MUTED, localStorage) === '1'; },

    /** Gọi TRONG handler submit → user gesture hợp lệ, trình duyệt cho phép play. */
    start() {
      this.probe().then((ok) => {
        if (!ok) return;
        if (this.muted) { this.show(false); return; }

        bgm.volume = 0;
        const p = bgm.play();

        if (p && typeof p.then === 'function') {
          p.then(() => { this.fadeIn(); this.show(true); })
           .catch(() => { this.show(false); });   // vẫn bị chặn → hiện nút để tự bật
        } else {
          this.fadeIn();
          this.show(true);
        }
      });
    },

    fadeIn() {
      const target = CONFIG.audio.volume;
      if (reducedMotion()) { bgm.volume = target; return; }

      const step = 50;
      const inc  = target / (CONFIG.audio.fadeMs / step);
      const id = setInterval(() => {
        bgm.volume = Math.min(target, bgm.volume + inc);
        if (bgm.volume >= target - 0.001) clearInterval(id);
      }, step);
    },

    show(playing) {
      if (!this.available) return;
      audioBtn.hidden = false;
      this.paint(playing);
    },

    paint(playing) {
      audioBtn.setAttribute('aria-pressed', String(playing));
      audioBtn.setAttribute('aria-label', playing ? 'Tắt nhạc nền' : 'Bật nhạc nền');
      $('.audio-toggle__icon', audioBtn).textContent = playing ? '🔊' : '🔇';
    },

    toggle() {
      if (bgm.paused) {
        bgm.volume = 0;
        const p = bgm.play();
        if (p) p.then(() => this.fadeIn()).catch(() => {});
        store.set(KEY_MUTED, '0', localStorage);
        this.paint(true);
      } else {
        bgm.pause();
        store.set(KEY_MUTED, '1', localStorage);
        this.paint(false);
      }
    },
  };

  /* ── File .ics ──────────────────────────────────────────────── */
  function escapeIcs(text) {
    return String(text).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  }

  function downloadIcs() {
    const location = [CONFIG.venue, CONFIG.address].filter(Boolean).join(', ');
    const stamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Dawn//Thiep moi tot nghiep//VI',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:grad-dawn-20260926@invite.local',
      `DTSTAMP:${stamp}`,
      `DTSTART:${CONFIG.event.startUtc}`,
      `DTEND:${CONFIG.event.endUtc}`,
      `SUMMARY:${escapeIcs(CONFIG.event.title)}`,
      `LOCATION:${escapeIcs(location)}`,
      'DESCRIPTION:Lễ trao bằng tốt nghiệp đại học.',
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'le-tot-nghiep-cua-duc.ics';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ── Điều hướng màn hình ────────────────────────────────────── */
  function openCard(name, year, { animate }) {
    store.set(KEY_GUEST, name);
    if (year) store.set(KEY_YEAR, String(year)); else store.del(KEY_YEAR);

    const url = new URL(window.location.href);
    url.searchParams.set('guest', name);
    if (year) url.searchParams.set('year', String(year));
    else url.searchParams.delete('year');
    history.replaceState(null, '', url);

    renderName(name);
    renderPronoun(year);
    card.hidden = false;
    heroSlider.init();                          // sau khi card hiện, ảnh mới có kích thước

    if (!animate || reducedMotion()) {
      gate.hidden = true;
      initReveal();
      return;
    }

    gate.classList.add('is-leaving');
    setTimeout(() => {
      gate.hidden = true;
      initReveal();
    }, 450);
  }

  function backToGate() {
    store.del(KEY_GUEST);
    store.del(KEY_YEAR);

    const url = new URL(window.location.href);
    url.searchParams.delete('guest');
    url.searchParams.delete('year');
    history.replaceState(null, '', url);

    if (bgm) bgm.pause();
    heroSlider.pause();
    card.hidden = true;
    gate.hidden = false;
    gate.classList.remove('is-leaving');
    gateInput.value = '';
    yearInput.value = '';
    gateError.textContent = '';
    window.scrollTo(0, 0);
    gateInput.focus();
  }

  function showError(msg, field = gateInput) {
    gateError.textContent = msg;
    field.classList.remove('is-shaking');
    void field.offsetWidth;                     // ép reflow để animation chạy lại
    field.classList.add('is-shaking');
    field.focus();
  }

  /* ── Bootstrap ──────────────────────────────────────────────── */
  renderStaticContent();

  gateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = normalizeName(gateInput.value);

    if (!isValidName(name)) {
      showError(
        gateInput.value.trim()
          ? `Tên hơi dài rồi — tối đa ${NAME_MAX} ký tự nhé.`
          : 'Đức cần biết tên bạn để ghi lên thiệp 🙂'
      );
      return;
    }

    const rawYear = yearInput.value.trim();
    const year = normalizeYear(rawYear);

    if (!year) {
      showError(
        rawYear
          ? `Năm sinh cần là 4 chữ số trong khoảng ${YEAR_MIN}–${YEAR_MAX}.`
          : 'Đức cần năm sinh của bạn để xưng hô cho đúng 🙂',
        yearInput
      );
      return;
    }

    gateError.textContent = '';
    audio.start();                              // ngay trong gesture của submit
    openCard(name, year, { animate: true });
  });

  [gateInput, yearInput].forEach((el) => {
    el.addEventListener('input', () => { gateError.textContent = ''; });
  });

  // Ô năm sinh chỉ nhận chữ số — chặn luôn khi paste.
  yearInput.addEventListener('input', () => {
    const cleaned = yearInput.value.replace(/\D/g, '').slice(0, 4);
    if (cleaned !== yearInput.value) yearInput.value = cleaned;
  });

  $('#scroll-cue').addEventListener('click', () => {
    $('#letter').scrollIntoView({
      behavior: reducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  });

  $('#btn-calendar').addEventListener('click', downloadIcs);
  $('#btn-reset').addEventListener('click', backToGate);
  audioBtn.addEventListener('click', () => audio.toggle());

  // Vào thẳng Màn 2 nếu URL đã có ?guest= hoặc session còn tên.
  const params  = new URLSearchParams(location.search);
  const fromUrl = normalizeName(params.get('guest'));
  const saved   = normalizeName(store.get(KEY_GUEST));
  const preset  = isValidName(fromUrl) ? fromUrl : (isValidName(saved) ? saved : '');

  // Năm trên URL thắng năm trong session (link riêng gửi cho từng người).
  const presetYear = isValidName(fromUrl)
    ? normalizeYear(params.get('year'))
    : (normalizeYear(params.get('year')) || normalizeYear(store.get(KEY_YEAR)));

  if (preset && presetYear) {
    openCard(preset, presetYear, { animate: false });
    // Không autoplay ở đây: chưa có user gesture, trình duyệt sẽ chặn.
    // Chỉ hiện nút để khách tự bật, và chỉ khi file nhạc thật sự tồn tại.
    audio.probe().then((ok) => { if (ok) audio.show(false); });
  } else {
    // Thiếu một trong hai → ở lại Màn 1, điền sẵn phần đã có cho đỡ gõ lại.
    if (preset) gateInput.value = preset;
    if (presetYear) yearInput.value = String(presetYear);
    (preset ? yearInput : gateInput).focus({ preventScroll: true });
  }
})();
