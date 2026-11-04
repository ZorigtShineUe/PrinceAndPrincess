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

  // Алтан тасалбар: булангууд нь хонхойсон, доод хэсэгт нь цоолтуурын шугамтай (300×440)
  const TICKET_D = 'M16 0H284A16 16 0 0 0 300 16V316A14 14 0 0 0 300 344V424A16 16 0 0 0 284 440'
    + 'H16A16 16 0 0 0 0 424V344A14 14 0 0 0 0 316V16A16 16 0 0 0 16 0Z';
  let ticketUid = 0;
  function goldTicket({ name, table, stub }) {
    const id = `gt${++ticketUid}`;
    return `<div class="gold-ticket${name ? ' named' : ''}">
      <svg class="gt-shape" viewBox="0 0 300 440" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="${id}-foil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#b07f2c"/><stop offset=".22" stop-color="#f8e4a6"/>
            <stop offset=".45" stop-color="#d8a93b"/><stop offset=".68" stop-color="#fff1c2"/>
            <stop offset="1" stop-color="#a8752a"/>
          </linearGradient>
          <linearGradient id="${id}-shine" x1="0" x2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".7"/>
            <stop offset="1" stop-color="#fff" stop-opacity="0"/>
          </linearGradient>
          <clipPath id="${id}-clip"><path d="${TICKET_D}"/></clipPath>
        </defs>
        <path d="${TICKET_D}" fill="url(#${id}-foil)"/>
        <g clip-path="url(#${id}-clip)"><rect class="gt-shine" x="-220" y="-20" width="120" height="480" fill="url(#${id}-shine)"/></g>
        <rect x="18" y="18" width="264" height="292" rx="10" fill="none" stroke="#7d1121" stroke-opacity=".5" stroke-width="1.6"/>
        <rect x="25" y="25" width="250" height="278" rx="7" fill="none" stroke="#7d1121" stroke-opacity=".25"/>
        <line x1="22" y1="330" x2="278" y2="330" stroke="#7d1121" stroke-opacity=".55" stroke-width="2" stroke-dasharray="7 6"/>
      </svg>
      <div class="gt-main">
        <span class="gt-kicker">Шинэ жил 2027</span>
        <svg class="gt-crown" viewBox="0 0 46 28" aria-hidden="true"><path d="${CROWN_D}"/></svg>
        <strong class="gt-title">Алтан<br>тасалбар</strong>
        ${name ? `<span class="gt-name">${esc(name)}</span>` : ''}
        <span class="gt-n">${table ? `Ширээ ${esc(table)} · Азтан` : 'Шинэ жилийн азтан'}</span>
      </div>
      <div class="gt-stub">${esc(stub)}</div>
    </div>`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  gsap.registerPlugin(DrawSVGPlugin);
  window.Shine = { api, candidateEl, markChosen, fullName, esc, ensureShieldClip, deadlineFrom, clock, goldTicket };
})();
