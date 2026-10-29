// Хуудсуудад нийтлэг: API дуудлага, нэр дэвшигчийн бамбай (сүлдний хэлбэр) зураг.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  // Сургуулийн сүлдний бамбайн хэлбэр (0..100 координат)
  const SHIELD_D =
    'M0 14 C20 14 30 0 45 2 Q50 3 50 6 Q50 3 55 2 C70 0 80 14 100 14 L100 56 C100 80 76 94 50 100 C24 94 0 80 0 56 Z';
  const CROWN_D = 'M4 26 L2 8 L13 17 L23 2 L33 17 L44 8 L42 26 Z';

  async function api(url, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (opts.body && typeof opts.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    if (location.protocol === 'file:') {
      throw new Error('Хуудсыг файлаар нээсэн байна. start.bat-аар серверийг асаагаад http://localhost:3000 хаягаар нээнэ үү');
    }
    let res;
    try {
      res = await fetch(url, { credentials: 'same-origin', ...opts, headers });
    } catch {
      // браузерын «Failed to fetch» — сервер унтарсан эсвэл сүлжээ тасарсан
      throw new Error('Сервертэй холбогдож чадсангүй. Сервер (start.bat) ажиллаж байгаа, сүлжээнд холбогдсон эсэхийг шалгаад дахин оролдоно уу');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Сервертэй холбогдож чадсангүй');
    return data;
  }

  // <svg> clipPath-ийг баримтад нэг удаа нэмнэ
  function ensureShieldClip() {
    if (document.getElementById('shield-clip')) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = `<defs><clipPath id="shield-clip" clipPathUnits="objectBoundingBox">
      <path transform="scale(0.01)" d="${SHIELD_D}"/></clipPath></defs>`;
    document.body.appendChild(svg);
  }

  function initials(c) {
    return ((c.lastName || '').charAt(0) + (c.firstName || '').charAt(0)).toUpperCase() || '?';
  }

  // Нэр дэвшигчийн бамбай + нэр. tag='button' бол сонгох боломжтой.
  function candidateEl(c, { tag = 'div', votes } = {}) {
    ensureShieldClip();
    const node = document.createElement(tag);
    node.className = 'candidate';
    node.dataset.id = c.id;
    node.dataset.role = c.role; // ханхүү улаан, гүнж ногоон бамбайтай
    if (tag === 'button') {
      node.type = 'button';
      node.setAttribute('aria-pressed', 'false');
    }
    const photo = c.photo
      ? `<img src="${esc(c.photo)}" alt="" loading="lazy">`
      : `<span class="initials">${esc(initials(c))}</span>`;
    node.innerHTML = `
      <svg class="crown" viewBox="0 0 46 28" aria-hidden="true"><path d="${CROWN_D}"/></svg>
      <span class="shield-wrap">
        <span class="shield">${photo}</span>
        <svg class="shield-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="${SHIELD_D}"/><path class="sel" d="${SHIELD_D}"/>
        </svg>
      </span>
      <span class="name"><span class="surname">${esc(c.lastName)}</span>${esc(c.firstName)}</span>
      <span class="dept">${esc(c.department)}</span>
      ${votes != null ? `<span class="votes">${votes} санал</span>` : ''}`;
    // сонгогдоогүй үед титэм, алтан хүрээ харагдахгүй
    gsap.set(node.querySelectorAll('.crown path, .shield-line .sel'), { drawSVG: '0%' });
    return node;
  }

  // Сонгох / сонголт цуцлах хөдөлгөөн
  function markChosen(node, on, instant) {
    const parts = node.querySelectorAll('.crown path, .shield-line .sel');
    node.classList.toggle('chosen', on);
    if (node.tagName === 'BUTTON') node.setAttribute('aria-pressed', String(on));
    const d = instant || (window.ShineFx && ShineFx.reduceMotion) ? 0 : 0.7;
    gsap.to(parts, { drawSVG: on ? '100%' : '0%', duration: on ? d : d / 2, ease: 'power2.inOut', stagger: on ? 0.15 : 0 });
  }

  // Серверийн revealAt-ыг энэ төхөөрөмжийн цагт хөрвүүлнэ (утасны цаг зөрүүтэй байж болно)
  function deadlineFrom(revealAt, serverNow) {
    if (!revealAt) return null;
    return Date.now() + (Date.parse(revealAt) - serverNow);
  }

  // 125000 → "2:05"
  function clock(ms) {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function fullName(c) {
    return `${c.lastName ? c.lastName.charAt(0) + '. ' : ''}${c.firstName}`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  gsap.registerPlugin(DrawSVGPlugin);
  window.Shine = { api, candidateEl, markChosen, fullName, esc, ensureShieldClip, deadlineFrom, clock };
})();
