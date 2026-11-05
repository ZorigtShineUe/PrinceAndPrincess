// Тодруулах дэлгэцийн (reveal.html) хоёр дахь хэсэг — санал хураалтын дараа, ханхүү гүнжийг
// тодруулахын өмнө эргэх азтан сугалах хүрд: Щелкунчикийн бөмбөр шиг хүрд, хоёр талд нь гацуур мод, бөмбөрчин.
// Хоёр шаттай: эхлээд ширээ (бүх ширээ ижил өргөнтэй хэсэг), дараа нь тэр
// ширээний нэрс. Азтаныг сервер сонгосон байх ба хүрд түүн дээр зогсоно. Азтан утсаа
// холбосон бол яг тэр мөчид утсанд нь алтан тасалбар гарна. reveal.js ShineLucky.enter/leave-ээр удирдана.
(function () {
  const { api } = Shine;
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const adminKey = localStorage.getItem('shine2027-admin');
  const SLICE_R = 95;
  const BULBS = 32;
  // хилэн улаан, зааны ясан цагаан, маргад ногоон — чихэр саваа шиг ээлжилнэ
  const CRIMSON = '#b51f36', IVORY = '#f7ecd8', EMERALD = '#1d6b4c', GOLD = '#e2b955';
  const SLICE_COLORS = [CRIMSON, IVORY, EMERALD, IVORY];
  const INK = { [CRIMSON]: IVORY, [IVORY]: '#7d1121', [EMERALD]: IVORY, [GOLD]: '#4a0711' };

  // цас, хөшиг, confetti, салютыг тодруулах дэлгэц (reveal.js) эзэмшинэ — init-ээр дамжуулна
  let confetti = null;
  let fireworks = null;
  const reduce = ShineFx.reduceMotion;

  const el = (tag, attrs) => {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  };
  const polar = (deg, r) => {
    const a = (deg - 90) * Math.PI / 180; // 0° = дээд тал, цагийн зүүний дагуу
    return [Math.cos(a) * r, Math.sin(a) * r];
  };

  // ---------- хүрдний хоёр талын зураг: хавтгай геометр хэлбэр, налуу өнгө, ширхэгтэй бүтэц ----------
  // Ширхэгтэй бүтэц (grain): дүрсийн дээр жижиг бараан цэгүүд нэмнэ
  const grain = (id) => `<filter id="${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 0.6" result="dots"/>
      <feComposite in="dots" in2="SourceAlpha" operator="in" result="speck"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="speck"/></feMerge>
    </filter>`;
  const star = (cx, cy, r) => {
    const pts = [];
    for (let i = 0; i < 10; i++) pts.push(polar(i * 36, i % 2 ? r * 0.45 : r).map((v, j) => (v + (j ? cy : cx)).toFixed(2)).join(','));
    return pts.join(' ');
  };

  // Бөмбөрчин Щелкунчик (160×360) — өндөр улаан малгай, хар сахал, бөмбөр барьсан
  function drummer() {
    const K = '#1a1416', SKIN = 'url(#nc-skin)', RED = 'url(#nc-red)', GOLDF = 'url(#nc-gold)', TEAL = 'url(#nc-teal)', CREAM = '#f3e2b8';
    const frogs = [184, 198, 212, 226].map((y) => `<path d="M63 ${y}h34" stroke="${GOLDF}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="63" cy="${y}" r="2.4" fill="${GOLD}"/><circle cx="97" cy="${y}" r="2.4" fill="${GOLD}"/>`).join('');
    const fringe = (x0) => [0, 4, 8, 12, 16, 20].map((d) => `<path d="M${x0 + d} 174v9" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round"/>`).join('');
    const zig = [];
    for (let x = 44, i = 0; x <= 116; x += 9, i++) zig.push(`${x},${i % 2 ? 296 : 254}`);
    const hair = 'M62 120l-16 2 9 5-14 5 12 3-11 8 13 0-6 9 14-6 4 4z';
    return `<svg viewBox="0 0 160 360">
      <defs>
        <linearGradient id="nc-red" x1="0" x2="1"><stop offset="0" stop-color="#cc2e40"/><stop offset="1" stop-color="#8a1222"/></linearGradient>
        <linearGradient id="nc-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e19b"/><stop offset=".55" stop-color="#d9ab4c"/><stop offset="1" stop-color="#a87a2a"/></linearGradient>
        <linearGradient id="nc-teal" x1="0" x2="1"><stop offset="0" stop-color="#1f6b70"/><stop offset="1" stop-color="#0c3236"/></linearGradient>
        <linearGradient id="nc-skin" x1="0" x2="1"><stop offset="0" stop-color="#fbe2c9"/><stop offset="1" stop-color="#ecbd99"/></linearGradient>
        ${grain('nc-grain')}
      </defs>
      <ellipse cx="80" cy="351" rx="54" ry="7" fill="#000" opacity=".35"/>
      <g filter="url(#nc-grain)">
        <path d="M50 246h15l-2 86-16-4z" fill="${RED}"/><path d="M95 246h15l3 82-16 4z" fill="#7a0f1d"/>
        <rect x="63" y="300" width="14" height="42" fill="${TEAL}"/><rect x="83" y="300" width="14" height="42" fill="${TEAL}"/>
        <path d="M65 308l10 6-10 6 10 6-10 6M85 308l10 6-10 6 10 6-10 6" stroke="${GOLD}" stroke-width="1.6" fill="none"/>
        <rect x="63" y="300" width="14" height="4" fill="${GOLD}"/><rect x="83" y="300" width="14" height="4" fill="${GOLD}"/>
        <rect x="56" y="338" width="22" height="10" rx="5" fill="${K}"/><rect x="82" y="338" width="22" height="10" rx="5" fill="${K}"/>
        <path d="M52 168h56l4 94H48z" fill="${RED}"/>
        <rect x="74" y="166" width="12" height="90" fill="${K}"/>
        ${frogs}
        <rect x="66" y="159" width="28" height="10" rx="2" fill="${GOLDF}"/>
        <path d="${hair}" fill="${K}"/><path d="${hair}" fill="${K}" transform="translate(160 0) scale(-1 1)"/>
        <rect x="58" y="116" width="44" height="44" rx="6" fill="${SKIN}"/>
        <path d="M65 132q4.5-4.5 9 0M86 132q4.5-4.5 9 0" stroke="${K}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <circle cx="64" cy="142" r="5.5" fill="#ef8a7d" opacity=".75"/><circle cx="96" cy="142" r="5.5" fill="#ef8a7d" opacity=".75"/>
        <ellipse cx="80" cy="139" rx="3.6" ry="4.2" fill="#e7a283"/>
        <g class="jaw">
          <rect x="66" y="149" width="28" height="12" rx="4" fill="${SKIN}"/>
          <rect x="72" y="150" width="16" height="3" rx="1.5" fill="#5a1018"/>
          <path d="M70 158h20l-4 10h-12z" fill="${K}"/>
        </g>
        <path d="M80 145c-6-5-14-5-20 0c-4 3-8 2-10-2c0 6 6 10 13 8c6-1 11-3 17-4c6 1 11 3 17 4c7 2 13-2 13-8c-2 4-6 5-10 2c-6-5-14-5-20 0z" fill="${K}"/>
        <path d="M56 116l-4-72q28-8 56 0l-4 72z" fill="${RED}"/>
        <ellipse cx="80" cy="43" rx="28" ry="6" fill="${GOLDF}"/><ellipse cx="80" cy="42" rx="23" ry="3.6" fill="#6e0d19"/>
        <rect x="78" y="31" width="4" height="9" fill="${GOLD}"/><circle cx="80" cy="30" r="5.5" fill="${GOLDF}"/>
        <path d="M66 54l4 7-4 7-4-7zM80 51l5 9-5 9-5-9zM94 54l4 7-4 7-4-7z" fill="${GOLDF}"/>
        <circle cx="80" cy="91" r="13" fill="${GOLDF}"/><circle cx="80" cy="91" r="10" fill="${TEAL}"/>
        <polygon points="${star(80, 91, 7)}" fill="${GOLD}"/>
        <rect x="54" y="106" width="52" height="10" rx="2" fill="${CREAM}"/><rect x="54" y="106" width="52" height="2.5" fill="${GOLD}"/>
        <ellipse cx="51" cy="170" rx="13" ry="6" fill="${GOLDF}"/>${fringe(41)}
        <ellipse cx="109" cy="170" rx="13" ry="6" fill="${GOLDF}"/>${fringe(99)}
        <rect x="44" y="246" width="72" height="58" fill="${TEAL}"/>
        <polyline points="${zig.join(' ')}" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
        <rect x="42" y="296" width="76" height="9" rx="3" fill="${GOLDF}"/>
        <rect x="42" y="243" width="76" height="9" rx="3" fill="${GOLDF}"/>
        <ellipse cx="80" cy="243" rx="37" ry="6.5" fill="${CREAM}" stroke="${GOLD}" stroke-width="1.5"/>
        <g class="arm-l">
          <rect x="40" y="172" width="14" height="54" rx="7" fill="${RED}"/><rect x="40" y="218" width="14" height="6" fill="${GOLDF}"/>
          <g class="stick-l"><path d="M47 230L69 243" stroke="${CREAM}" stroke-width="3" stroke-linecap="round"/><circle cx="71" cy="245" r="4.5" fill="${TEAL}"/></g>
          <circle cx="47" cy="230" r="7" fill="${SKIN}"/>
        </g>
        <g class="arm-r">
          <rect x="106" y="172" width="14" height="54" rx="7" fill="${RED}"/><rect x="106" y="218" width="14" height="6" fill="${GOLDF}"/>
          <g class="stick-r"><path d="M113 230L91 243" stroke="${CREAM}" stroke-width="3" stroke-linecap="round"/><circle cx="89" cy="245" r="4.5" fill="${TEAL}"/></g>
          <circle cx="113" cy="230" r="7" fill="${SKIN}"/>
        </g>
      </g>
    </svg>`;
  }

  // Гацуур мод, доор нь боодолтой бэлэг (220×360) — бөмбөрчинтэй ижил хэв маяг
  function xmasTree() {
    const tiers = [[150, 282, 92], [104, 226, 74], [62, 170, 56], [26, 118, 38]];
    const tierSvg = tiers.map(([a, b, w]) => `<polygon points="110,${a} ${110 - w},${b} 110,${b + 7}" fill="url(#xt-dark)"/>
      <polygon points="110,${a} ${110 + w},${b} 110,${b + 7}" fill="url(#xt-light)"/>`).join('');
    const garland = tiers.map(([, b, w]) => `<path d="M${110 - w * 0.78} ${b - 16}Q110 ${b + 4} ${110 + w * 0.7} ${b - 30}" fill="none"
      stroke="${GOLD}" stroke-width="2.6" stroke-dasharray="0 6.5" stroke-linecap="round"/>`).join('');
    const balls = [
      [86, 100, 5, CRIMSON], [128, 92, 4.5, GOLD], [100, 146, 5.5, IVORY], [140, 154, 6, CRIMSON], [70, 160, 5, GOLD],
      [118, 196, 6, GOLD], [62, 210, 6, CRIMSON], [152, 212, 5.5, IVORY], [92, 258, 6.5, CRIMSON], [44, 268, 6, IVORY],
      [176, 270, 6.5, GOLD], [134, 252, 5, CRIMSON], [104, 60, 4, GOLD],
    ].map(([x, y, r, c]) => `<g class="bauble"><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>
      <circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity=".55"/></g>`).join('');
    return `<svg viewBox="0 0 220 360">
      <defs>
        <linearGradient id="xt-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a5c50"/><stop offset="1" stop-color="#0b302b"/></linearGradient>
        <linearGradient id="xt-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8a68"/><stop offset="1" stop-color="#1a5c47"/></linearGradient>
        <linearGradient id="xt-red" x1="0" x2="1"><stop offset="0" stop-color="#cc2e40"/><stop offset="1" stop-color="#8a1222"/></linearGradient>
        <linearGradient id="xt-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e19b"/><stop offset=".55" stop-color="#d9ab4c"/><stop offset="1" stop-color="#a87a2a"/></linearGradient>
        <radialGradient id="xt-halo"><stop offset="0" stop-color="${GOLD}" stop-opacity=".55"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
        ${grain('xt-grain')}
      </defs>
      <ellipse cx="110" cy="351" rx="96" ry="8" fill="#000" opacity=".35"/>
      <circle class="halo" cx="110" cy="24" r="34" fill="url(#xt-halo)"/>
      <g filter="url(#xt-grain)">
        <rect x="100" y="272" width="20" height="40" fill="#4a2a1a"/>
        ${tierSvg}
        ${garland}
        ${balls}
        <polygon class="topstar" points="${star(110, 24, 17)}" fill="url(#xt-gold)"/>
        <g class="gift">
          <rect x="66" y="288" width="88" height="58" fill="url(#xt-red)"/>
          <rect x="104" y="288" width="12" height="58" fill="url(#xt-gold)"/>
          <rect x="66" y="288" width="88" height="5" fill="#000" opacity=".2"/>
          <g class="lid">
            <rect x="60" y="275" width="100" height="16" rx="2" fill="#a11a2c"/>
            <rect x="104" y="275" width="12" height="16" fill="url(#xt-gold)"/>
            <path d="M110 275C94 254 76 266 88 275zM110 275C126 254 144 266 132 275z" fill="url(#xt-gold)"/>
            <path d="M106 275l-8 16h5zM114 275l8 16h-5z" fill="#c79436"/>
            <circle cx="110" cy="274" r="5.5" fill="#c79436"/>
          </g>
        </g>
      </g>
    </svg>`;
  }

  $('.figure.tree').innerHTML = xmasTree();
  $('.figure.soldier').innerHTML = drummer();
  const soldier = $('.figure.soldier svg');
  const tree = $('.figure.tree svg');
  const jaws = soldier.querySelector('.jaw');
  const stickL = soldier.querySelector('.stick-l');
  const stickR = soldier.querySelector('.stick-r');
  const lid = tree.querySelector('.lid');
  gsap.set(stickL, { svgOrigin: '47 230' });
  gsap.set(stickR, { svgOrigin: '113 230' });
  gsap.set(lid, { svgOrigin: '110 291' });
  gsap.set(tree.querySelector('.halo'), { svgOrigin: '110 24' });
  // гацуурын чимэглэл аажуу анивчина, оддын туяа амьсгална
  if (!reduce) {
    gsap.to(tree.querySelectorAll('.bauble'), { opacity: 0.7, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.35, from: 'random' } });
    gsap.to(tree.querySelector('.halo'), { scale: 1.25, opacity: 0.6, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  // ---------- хүрдний хөдлөхгүй хэсэг: алтан утас, гэрэл, дэгээ ----------
  const spinner = $('#spinner');
  const pointer = $('#pointer');
  gsap.set(spinner, { svgOrigin: '0 0' });
  gsap.set(pointer, { svgOrigin: '0 -117' });

  const cord = [];
  for (let j = 0; j <= BULBS * 2; j++) cord.push(polar((j * 180) / BULBS, j % 2 ? 109 : 99).map((v) => v.toFixed(2)).join(','));
  $('#cord').setAttribute('points', cord.join(' '));
  const bulbs = [];
  for (let j = 0; j < BULBS; j++) {
    const [x, y] = polar((j * 360) / BULBS, 105);
    const b = el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 3, fill: '#fff1c2', filter: 'url(#glow)' });
    $('#bulbs').appendChild(b);
    bulbs.push(b);
  }
  // Дэгээнүүд хэсгүүдийг дагана: хэсэг бүрийн хил дээр нэг (хоёр хөрш хэсгийн яг дунд),
  // дотор нь жигд хоёр — бүх хэсэг ижил тооны дэгээтэй. Хэсэг олон бол зөвхөн хил дээр.
  let pegStep = 360 / 24;
  function buildPegs(n) {
    const per = n <= 16 ? 3 : 1;
    const count = n * per;
    pegStep = 360 / count;
    const g = $('#pegs');
    g.innerHTML = '';
    for (let j = 0; j < count; j++) {
      const [x, y] = polar(j * pegStep, 91);
      const edge = j % per === 0;
      g.appendChild(el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: edge ? 2.3 : 1.7, fill: GOLD, stroke: '#7d1121', 'stroke-width': 0.6 }));
    }
  }

  // гэрлүүд ээлжлэн асна: зогсонги үед удаан, эргэх үед хурдан
  let chaseCall = null;
  let chaseOn = 0;
  function chase(interval) {
    if (chaseCall) chaseCall.kill();
    chaseCall = null;
    if (!interval) return;
    const step = () => {
      chaseOn ^= 1;
      bulbs.forEach((b, i) => b.setAttribute('fill-opacity', i % 2 === chaseOn ? 1 : 0.25));
      chaseCall = gsap.delayedCall(interval, step);
    };
    step();
  }

  // ---------- хүрдний хэсгүүд ----------
  // items = [{ key, label }]. Бүх хэсэг ижил өргөнтэй, хэсэг бүр [a0, a1] градус (0° = дээд тал, цагийн зүүний дагуу).
  let slices = [];
  let rot = 0;
  let wheelSig = '';

  function arc(a0, a1, r) {
    if (a1 - a0 >= 359.99) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
    const [x0, y0] = polar(a0, r), [x1, y1] = polar(a1, r);
    return `M0 0L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
  }

  // kind: 'table' — дугаар хэсгийн голд хөндлөн; 'name' — нэр радиусын дагуу
  function buildWheel(items, kind) {
    wheelSig = kind + JSON.stringify(items);
    const g = $('#slices');
    const lg = $('#labels');
    g.innerHTML = '';
    lg.innerHTML = '';
    slices = [];
    const empty = !items.length;
    if (empty) items = Array.from({ length: 12 }, (_, i) => ({ key: i, label: '' }));
    const n = items.length;
    buildPegs(n);
    let a = 0;
    items.forEach((it, i) => {
      const a0 = a, a1 = a + 360 / n;
      a = a1;
      // хэсгийн тоо 4-т хуваахад 1 үлдвэл эхний, сүүлийн хэсэг хоёулаа улаан болох тул сүүлийнхийг алтлана
      const color = n % 4 === 1 && i === n - 1 && n > 1 ? GOLD : SLICE_COLORS[i % 4];
      const path = el('path', { d: arc(a0, a1, SLICE_R), fill: color, stroke: GOLD, 'stroke-width': n > 24 ? 0.4 : 0.8 });
      g.appendChild(path);
      slices.push({ ...it, a0, a1, path });
      if (it.label) lg.appendChild(label(it.label, (a0 + a1) / 2, a1 - a0, kind, INK[color]));
    });
    gsap.set(slices.map((s) => s.path), { opacity: empty ? 0.35 : 1 });
    gsap.set('#win-slice', { opacity: 0 });
  }

  function label(text, mid, span, kind, fill) {
    const t = el('text', { fill, 'dominant-baseline': 'central' });
    if (kind === 'table') {
      // дугаар: хэсгийн өргөнд багтах хэмжээтэй, хүрдний гадна руу «дээшээ» харна
      const size = Math.min(22, (span * Math.PI / 180) * 66 * 0.62);
      if (size < 5) return t;
      const [x, y] = polar(mid, 66);
      t.setAttribute('class', 'num');
      t.setAttribute('font-size', size.toFixed(1));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${mid.toFixed(2)})`);
      t.textContent = text;
      return t;
    }
    // нэр: «Овог Нэр» → «О. Нэр» (заншил ёсоор), голоос хүрээ рүү уншигдана.
    // Хэсгийн өргөн ба радиусын урт хоёуланд нь багтах хэмжээгээр жижгэрнэ — тасдахгүй.
    const words = text.split(' ');
    const short = words.length > 1 ? `${words[0].charAt(0)}. ${words.slice(1).join(' ')}` : text;
    const room = 88 - 33;
    const size = Math.min(11, (span * Math.PI / 180) * 62 * 0.62, room / (short.length * 0.55));
    if (size < 3) return t;
    t.textContent = short;
    t.setAttribute('font-size', size.toFixed(1));
    const left = mid > 180;
    t.setAttribute('text-anchor', left ? 'start' : 'end');
    t.setAttribute('transform', left ? `rotate(${(mid + 90).toFixed(2)}) translate(-88 0)` : `rotate(${(mid - 90).toFixed(2)}) translate(88 0)`);
    return t;
  }

  const tableItems = (rows) => rows.map((r) => ({ key: r.table, label: r.table }));
  const nameItems = (rows) => rows.map((r) => ({ key: r.id, label: r.name }));

  // ---------- бөмбөрчин ба гацуурын хөдөлгөөн ----------
  let march = null;
  const chomp = () => gsap.to(jaws, { y: 5, duration: 0.1, yoyo: true, repeat: 3, ease: 'power1.inOut' });
  if (!reduce) gsap.delayedCall(3, function idleChomp() {
    if (phase === 'idle') chomp();
    gsap.delayedCall(5 + Math.random() * 3, idleChomp);
  });
  // хүрд эргэх зуур бөмбөр дэлдэнэ: хоёр саваа ээлжлэн өргөгдөж бөмбөрийн толгойг цохино,
  // бөмбөрчин өөрөө хөдөлгөөнгүй зогсоно. Саваа доошоо хурдсаж цохино (power2.in), буцахдаа удааширна.
  function startMarch() {
    if (reduce) return;
    if (march) march.kill();
    const hit = (stick, lift) => gsap.fromTo(stick, { rotation: lift }, { rotation: 0, duration: 0.13, yoyo: true, repeat: -1, ease: 'power2.in' });
    march = gsap.timeline()
      .add(hit(stickL, -45), 0)
      .add(hit(stickR, 45), 0.13);
  }
  function stopMarch() {
    if (march) march.kill();
    march = null;
    gsap.to([stickL, stickR], { rotation: 0, duration: 0.2 });
  }
  // азтан тодроход: бөмбөрчин хоёр саваагаа өргөнө, бэлгийн таг дээш үсэрнэ
  function cheer(animate) {
    const t = animate && !reduce ? 0.6 : 0;
    gsap.to(stickL, { rotation: -110, duration: t, ease: 'back.out(2)', overwrite: true });
    gsap.to(stickR, { rotation: 110, duration: t, ease: 'back.out(2)', delay: t ? 0.08 : 0, overwrite: true });
    if (!t) return gsap.set(lid, { y: -12, rotation: -8 });
    gsap.timeline()
      .to(lid, { y: -26, rotation: -14, duration: 0.35, ease: 'power3.out' })
      .to(lid, { y: -12, rotation: -8, duration: 0.5, ease: 'bounce.out' });
  }
  function rest() {
    gsap.to([stickL, stickR], { rotation: 0, duration: 0.5 });
    gsap.to(lid, { y: 0, rotation: 0, duration: 0.5 });
  }

  // ---------- эргэлт ----------
  let spinTl = null; // админ эргэлтийн дундуур цуцалбал зогсооно
  // Хүрд: ухарч авч → хурдан эргээд → удааширч → дэгээ сүүлийн дэгээн дээр бага зэрэг буцаж тогтоно.
  // theta — дэгээний доор ирэх өнцөг (хүрдний өөрийн координатаар).
  function spin(theta, seconds, done) {
    const turns = Math.max(3, Math.round(seconds * 0.7));
    const base = rot + 360 * turns;
    const target = base + ((((-theta - base) % 360) + 360) % 360);
    rot = target;
    if (reduce) {
      gsap.set(spinner, { rotation: target });
      spinTl = gsap.delayedCall(seconds, done);
      return;
    }
    chase(0.08);
    const wind = 0.5, settle = 0.4;
    spinTl = gsap.timeline()
      .to(spinner, { rotation: '-=14', duration: wind, ease: 'power2.inOut' })
      .to(spinner, { rotation: target + 3, duration: Math.max(1, seconds - wind - settle), ease: 'power3.out' })
      .to(spinner, { rotation: target, duration: settle, ease: 'sine.inOut' })
      .call(done);
  }

  // ---------- заагчийн физик ----------
  // Заагч (дэгээ) хүрдний эргэлтээс кадр бүрт тооцогдоно. Дэгээ үзүүрт шүргэлцэх үед заагч түүнийг
  // даган хазайна (хөшүүргийн харьцаа ≈ 91/26 — дэгээний радиус / заагчийн шүргэлтийн цэг),
  // дэгээ үзүүрээс мултармагц сааруулагчтай пүрш шиг буцаж савлана. Хурдан эргэхэд дараагийн
  // дэгээ ирэхээс өмнө буцаж амжихгүй тул чичирнэ; удаашрахад «түлхэж → тасхийх» нь тод сонсогдоно.
  // Бүгд хүрдний градусаар: px — заагчийн үзүүрийн хажуугийн байрлал (эерэг = баруун),
  // CONTACT — дэгээ үзүүрт хүрэх зай, XMAX — дэгээ үзүүрийн доогуур мултрах хамгийн их хазайлт.
  // Заагчийн эргэлт = -LEVER × px (сөрөг эргэлт = үзүүр баруун тийш).
  const LEVER = 3.5, CONTACT = 3, XMAX = 7;
  const OMEGA = 2 * Math.PI * 7, ZETA = 0.28; // пүршний давтамж (7 Гц), сааруулалт
  let px = 0, pv = 0, lastR = null, lastStep = 0;
  let passing = new Set(); // үзүүрийн доогуур гарч буй дэгээнүүд — салтлаа тэднийг тооцохгүй
  const pegsNear = (R, fn) => {
    const j0 = Math.floor(-R / pegStep);
    for (let j = j0 - 1; j <= j0 + 2; j++) fn(j, j * pegStep + R);
  };
  if (!reduce) gsap.ticker.add((time, deltaMs) => {
    const R = gsap.getProperty(spinner, 'rotation');
    // эхний кадр, хүрд солигдсон эсвэл үсэрсэн: үзүүртэй давхцаж буй дэгээг «гарч буй» гэж үзнэ
    if (lastR === null || lastStep !== pegStep || Math.abs(R - lastR) > 90) {
      lastR = R;
      lastStep = pegStep;
      passing = new Set();
      pegsNear(R, (j, phi) => { if (Math.abs(phi - px) < CONTACT) passing.add(j); });
    }
    const dR = R - lastR;
    if (!dR && Math.abs(px) < 1e-3 && Math.abs(pv) < 1e-3) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    const steps = Math.max(1, Math.ceil(dt / 0.002));
    const h = dt / steps;
    for (let i = 1; i <= steps; i++) {
      pv += (-OMEGA * OMEGA * px - 2 * ZETA * OMEGA * pv) * h;
      px += pv * h;
      pegsNear(lastR + (dR * i) / steps, (j, phi) => {
        const d = phi - px;
        if (passing.has(j)) { if (Math.abs(d) >= CONTACT) passing.delete(j); return; }
        if (Math.abs(d) >= CONTACT) return;
        // дэгээ ирсэн талаасаа түлхэнэ; хэт их хазайвал үзүүрийн доогуур мултарна
        const nx = d < 0 ? phi + CONTACT : phi - CONTACT;
        if (Math.abs(nx) > XMAX) {
          passing.add(j);
          px = Math.sign(nx) * XMAX;
          pv = 0;
        } else {
          px = nx;
          if (d < 0 ? pv < 0 : pv > 0) pv = 0;
        }
      });
    }
    lastR = R;
    gsap.set(pointer, { rotation: -LEVER * px });
  });

  // Хүрд зогсох цэг: тухайн хэсгийн дэгээнүүдийн хоорондох санамсаргүй завсар, дотор нь
  // санамсаргүй байрлал — дэгээ заагчид хүрэхгүй тул заагч яг голоо заан тайван зогсоно.
  function thetaIn(s) {
    const room = pegStep / 2 - CONTACT - 0.8;
    const gaps = [];
    for (let g = Math.ceil(s.a0 / pegStep - 1e-6); (g + 1) * pegStep <= s.a1 + 1e-6; g++) gaps.push((g + 0.5) * pegStep);
    if (!gaps.length || room <= 0) return (s.a0 + s.a1) / 2;
    return gaps[Math.floor(Math.random() * gaps.length)] + (Math.random() * 2 - 1) * room;
  }

  // Заагч савлахаа больж яг голоо заатал хүлээгээд дараагийн алхам руу шилжинэ
  let restCheck = null;
  function whenRested(fn) {
    restCheck = () => {
      if (Math.abs(px) > 0.01 || Math.abs(pv) > 0.05) return;
      gsap.ticker.remove(restCheck);
      restCheck = null;
      later(300, fn);
    };
    gsap.ticker.add(restCheck);
  }

  // ялсан хэсэг гэрэлтэж, бусад нь бүдгэрнэ
  function highlight(s) {
    const win = $('#win-slice');
    win.setAttribute('d', arc(s.a0, s.a1, SLICE_R));
    gsap.to(slices.filter((x) => x !== s).map((x) => x.path), { opacity: 0.3, duration: 0.5 });
    gsap.fromTo(win, { opacity: 0 }, { opacity: 1, duration: 0.25, yoyo: true, repeat: 4 });
    chase(null);
    gsap.fromTo(bulbs, { attr: { 'fill-opacity': 1 } }, { attr: { 'fill-opacity': 0.2 }, duration: 0.15, yoyo: true, repeat: 5 });
    const p = pointer.getBoundingClientRect();
    confetti.burst(p.left + p.width / 2, p.bottom, 160);
  }

  // ---------- төлвүүд ----------
  let info = null;
  let seenId = undefined; // эхний асуултаар одоогийн сугалааг «харсан» гэж тэмдэглэнэ
  let phase = 'idle'; // 'idle' | 'drawing' | 'result'
  let timers = [];
  const later = (ms, fn) => timers.push(gsap.delayedCall(Math.max(0, ms) / 1000, fn));
  const clearTimers = () => {
    timers.forEach((t) => t.kill());
    timers = [];
    if (spinTl) spinTl.kill();
    spinTl = null;
    if (restCheck) gsap.ticker.remove(restCheck);
    restCheck = null;
  };

  function setCounts() {
    if (!info) return;
    $('#lk-count').textContent = info.guests;
    $('#lk-tables').textContent = info.tables;
    $('#lk-empty').hidden = !(phase === 'idle' && info.guests === 0);
    // ганц л азтан тодорно — тодорсны дараа эргүүлэх товч алга болно
    $('#lk-draw').hidden = !adminKey || phase !== 'idle' || info.winners > 0;
    $('#lk-draw').disabled = !info.eligible;
    // азтан тодорсны дараа дараагийн алхам: ханхүү, гүнж тодруулах
    $('#lk-next').hidden = !adminKey || phase !== 'result';
  }

  function showIdle() {
    phase = 'idle';
    clearTimers();
    fireworks.stop();
    stopMarch();
    $('#lk-title').textContent = 'Азтан тодруулах';
    gsap.to('#lk-result', { autoAlpha: 0, duration: 0.4 });
    gsap.to(['#wheel', '.figure'], { autoAlpha: 1, duration: 0.6 });
    rest();
    buildWheel(info ? tableItems(info.wheel) : [], 'table');
    chase(reduce ? null : 0.6);
    setCounts();
  }

  // t = { tableEnd, nameStart, end } — энэ төхөөрөмжийн цагаар (ms). tableEnd == null бол ширээний шатыг алгасна.
  function playDraw(draw, t) {
    phase = 'drawing';
    clearTimers();
    fireworks.stop();
    setCounts();
    gsap.set('#lk-result', { autoAlpha: 0 });
    gsap.set(['#wheel', '.figure'], { autoAlpha: 1 });
    gsap.set([stickL, stickR], { rotation: 0 });
    gsap.set(lid, { y: 0, rotation: 0 });
    gsap.set('#face', { autoAlpha: 1, scale: 1, svgOrigin: '0 0' });
    buildWheel(tableItems(draw.wheel.tables), 'table');
    const winTable = slices.find((s) => s.key === draw.table);

    if (t.tableEnd == null) {
      gsap.set(spinner, { rotation: (rot = rot - (rot % 360) - thetaIn(winTable)) });
      return landTable(draw, t, winTable);
    }
    $('#lk-title').textContent = 'Ширээ сонгож байна…';
    startMarch();
    chomp();
    spin(thetaIn(winTable), (t.tableEnd - Date.now()) / 1000, () => whenRested(() => landTable(draw, t, winTable)));
  }

  function landTable(draw, t, s) {
    stopMarch();
    highlight(s);
    $('#lk-title').textContent = `Ширээ ${draw.table}!`;
    gsap.fromTo('#lk-title', { scale: 0.92 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
    chomp();
    // завсарлагааны дараа хүрд жижгэрч нэрсийн хүрд болон солигдоно
    later(t.nameStart - Date.now() - 600, () => {
      gsap.to('#face', { scale: 0.85, autoAlpha: 0, duration: 0.3, ease: 'power2.in', svgOrigin: '0 0' });
    });
    later(t.nameStart - Date.now() - 250, () => {
      buildWheel(nameItems(draw.wheel.names), 'name');
      gsap.to('#face', { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.6)', svgOrigin: '0 0' });
      $('#lk-title').textContent = `Ширээ ${draw.table} · нэр сонгож байна…`;
    });
    later(t.nameStart - Date.now() + 200, () => {
      const winName = slices.find((x) => x.key === draw.guestId);
      startMarch();
      spin(thetaIn(winName), (t.end - Date.now()) / 1000, () => whenRested(() => land(draw, winName)));
    });
  }

  function land(draw, s) {
    phase = 'result';
    stopMarch();
    highlight(s);
    // бөмбөрчин саваагаа өргөж, бэлгийн таг үсэрнэ
    cheer(true);
    showResult(draw, true);
  }

  function showResult(draw, fromDraw) {
    phase = 'result';
    clearTimers();
    $('#lk-title').textContent = 'Азтан тодорлоо!';
    $('#lk-ticket').innerHTML = Shine.goldTicket({
      name: draw.name, table: draw.table, stub: draw.claimed ? 'Азтаны утсанд очлоо' : 'Тайз дээр гардуулна',
    });
    $('#lk-result-table').textContent = `Ширээ ${draw.table}`;
    $('#lk-result-name').textContent = draw.name;
    $('#lk-result-text').textContent = draw.claimed
      ? 'Утсаа шалгаарай — алтан тасалбар таны утсанд!'
      : 'Тайз руу ирж алтан тасалбараа аваарай!';
    const tl = gsap.timeline({ delay: fromDraw && !reduce ? 1.6 : 0 });
    tl.to(['#wheel', '.figure'], { autoAlpha: 0.1, duration: 0.6 })
      .set('#lk-result', { autoAlpha: 1 })
      .fromTo('#lk-result .gold-ticket', { scale: 0.6, rotation: -16, opacity: 0 },
        { scale: 1, rotation: -4, opacity: 1, duration: reduce ? 0.3 : 1.1, ease: 'expo.out' })
      .fromTo('#lk-result-table', { opacity: 0 }, { opacity: 1, duration: 0.4 }, '-=0.7')
      .fromTo('#lk-result-name', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.5')
      .fromTo('#lk-result-text', { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.3')
      .call(() => {
        fireworks.start();
        const r = $('#lk-result .gold-ticket').getBoundingClientRect();
        confetti.burst(r.left + r.width / 2, r.top + r.height * 0.3, 240);
        setCounts();
      });
  }

  // ---------- сервертэй холбоо ----------
  function apply(next) {
    info = next;
    const cur = info.current;
    const first = seenId === undefined;
    if (cur && cur.id !== seenId) {
      seenId = cur.id;
      const now = Date.now();
      const t = {
        tableEnd: Shine.deadlineFrom(cur.tableAt, info.now),
        nameStart: Shine.deadlineFrom(cur.nameAt, info.now),
        end: Shine.deadlineFrom(cur.at, info.now),
      };
      if (t.tableEnd - now > 1500) return playDraw(cur, t);
      if (t.end - now > 2500) return playDraw(cur, { ...t, tableEnd: null }); // ширээний шатыг алгасна
      // хөдөлгөөн эхлэхээс өмнө тодорсон, эсвэл дэлгэцийг дахин ачааллав — азтан хэвээр харагдана
      if (first) cheer(false);
      return showResult(cur, false);
    }
    if (!cur && seenId) { // админ азтануудыг цэвэрлэв
      seenId = null;
      return showIdle();
    }
    if (first) {
      seenId = null;
      return showIdle();
    }
    // зочдын жагсаалт өөрчлөгдвөл зогсонги үед хүрдийг шинэчилнэ
    if (phase === 'idle' && wheelSig !== 'table' + JSON.stringify(tableItems(info.wheel))) buildWheel(tableItems(info.wheel), 'table');
    setCounts();
  }

  async function poll() {
    try {
      apply(await api('/api/lucky'));
    } catch { /* дахин оролдоно */ }
  }

  // админ энэ компьютер дээр нэвтэрсэн бол проектороос шууд эргүүлж болно
  async function draw() {
    if (!adminKey || phase !== 'idle' || !info || !info.eligible || info.winners > 0) return;
    $('#lk-draw').hidden = true;
    try {
      apply(await api('/api/admin/lucky-draw', { method: 'POST', headers: { 'x-admin-key': adminKey } }));
    } catch (err) {
      setCounts();
      alert(err.message);
    }
  }

  // ---------- тодруулах дэлгэцтэй холбох ----------
  let active = false;
  let pollTimer = null;
  let onNext = null;

  $('#lk-draw').addEventListener('click', draw);
  $('#lk-next').addEventListener('click', async () => {
    $('#lk-next').hidden = true;
    try {
      await api('/api/admin/settings', {
        method: 'POST', headers: { 'x-admin-key': adminKey }, body: { revealed: true, votingOpen: false },
      });
      if (onNext) onNext();
    } catch (err) {
      setCounts();
      alert(err.message);
    }
  });
  addEventListener('keydown', (e) => {
    if (!active || e.code !== 'Space' || e.repeat || e.target.closest('button, input, textarea')) return;
    e.preventDefault();
    draw();
  });

  gsap.set(['#lucky', '#lk-result'], { autoAlpha: 0 });

  window.ShineLucky = {
    // fx = { confetti, fireworks, onNext } — onNext: тодруулга эхэлсэн тул дэлгэц шинэчлэгдэнэ
    init(fx) {
      ({ confetti, fireworks, onNext } = fx);
    },
    enter() {
      if (active) return;
      active = true;
      seenId = undefined; // дахин ачаалсан мэт: дууссан сугалаа байвал азтан шууд харагдана
      phase = 'idle';
      gsap.to('#lucky', { autoAlpha: 1, duration: 0.6 });
      poll();
      pollTimer = setInterval(poll, 1000);
    },
    leave() {
      if (!active) return;
      active = false;
      clearInterval(pollTimer);
      clearTimers();
      stopMarch();
      chase(null);
      fireworks.stop();
      $('#lk-draw').hidden = true;
      $('#lk-next').hidden = true;
      gsap.to('#lucky', { autoAlpha: 0, duration: 0.6 });
    },
  };
})();
