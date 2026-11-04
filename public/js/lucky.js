// Тодруулах дэлгэцийн (reveal.html) хоёр дахь хэсэг — санал хураалтын дараа, ханхүү гүнжийг
// тодруулахын өмнө эргэх азтан сугалах хүрд: Щелкунчикийн бөмбөр шиг хүрд, хоёр талд нь харуулууд.
// Хоёр шаттай: эхлээд ширээ (хэсэг бүрийн өргөн = тэр ширээний зочдын тоо), дараа нь тэр
// ширээний нэрс. Азтаныг сервер сонгосон байх ба хүрд түүн дээр зогсоно. Азтан утсаа
// холбосон бол яг тэр мөчид утсанд нь алтан тасалбар гарна. reveal.js ShineLucky.enter/leave-ээр удирдана.
(function () {
  const { api } = Shine;
  const $ = (s) => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const adminKey = localStorage.getItem('shine2027-admin');
  const SLICE_R = 95;
  const PEGS = 24;
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

  // ---------- Щелкунчик харуул (140×320) ----------
  function nutcracker() {
    const R = CRIMSON, W = IVORY, G = GOLD, K = '#1c0609';
    const buttons = [174, 188, 204, 218].map((y) => `<circle cx="70" cy="${y}" r="2.8" fill="${G}"/>`).join('');
    return `<svg viewBox="0 0 140 320">
      <ellipse cx="70" cy="308" rx="46" ry="9" fill="#9c6a22"/>
      <ellipse cx="70" cy="305" rx="46" ry="8" fill="${G}"/>
      <rect x="49" y="246" width="18" height="46" fill="#0e3d2c"/><rect x="73" y="246" width="18" height="46" fill="#0e3d2c"/>
      <rect x="56.5" y="246" width="3" height="40" fill="${G}"/><rect x="80.5" y="246" width="3" height="40" fill="${G}"/>
      <rect x="45" y="284" width="24" height="17" rx="4" fill="${K}"/><rect x="71" y="284" width="24" height="17" rx="4" fill="${K}"/>
      <rect x="40" y="160" width="60" height="90" rx="9" fill="${R}"/>
      <path d="M44 166L96 226M96 166L44 226" stroke="${W}" stroke-width="5"/>
      ${buttons}
      <rect x="40" y="228" width="60" height="9" fill="${K}"/>
      <rect x="62" y="226.5" width="16" height="12" rx="2" fill="none" stroke="${G}" stroke-width="2.5"/>
      <rect x="25" y="166" width="15" height="56" rx="7.5" fill="${R}"/>
      <rect x="25" y="212" width="15" height="6" fill="${G}"/><circle cx="32.5" cy="226" r="7.5" fill="${W}"/>
      <ellipse cx="38" cy="165" rx="13" ry="6.5" fill="${G}"/><ellipse cx="102" cy="165" rx="13" ry="6.5" fill="${G}"/>
      <rect x="53" y="154" width="34" height="8" rx="2" fill="${G}"/>
      <rect x="36" y="100" width="10" height="44" rx="5" fill="${W}"/><rect x="94" y="100" width="10" height="44" rx="5" fill="${W}"/>
      <rect x="45" y="104" width="50" height="46" rx="7" fill="#f3c9a5"/>
      <rect x="56" y="113" width="9" height="3" rx="1.5" fill="${W}"/><rect x="75" y="113" width="9" height="3" rx="1.5" fill="${W}"/>
      <circle cx="60.5" cy="121" r="2.8" fill="${K}"/><circle cx="79.5" cy="121" r="2.8" fill="${K}"/>
      <circle cx="54" cy="131" r="5" fill="#e5807a" opacity=".55"/><circle cx="86" cy="131" r="5" fill="#e5807a" opacity=".55"/>
      <circle cx="70" cy="128" r="3.6" fill="#e9a785"/>
      <rect x="57" y="139" width="26" height="10" rx="2" fill="#3a0a12"/>
      <g class="jaw"><rect x="50" y="141" width="40" height="17" rx="5" fill="${W}"/><rect x="60" y="142.5" width="20" height="3" rx="1.5" fill="#7d1121"/></g>
      <path d="M70 136c-5-5-15-5-20 1c6 1 12 2 20 0c8 2 14 1 20 0c-5-6-15-6-20-1z" fill="${W}"/>
      <rect x="44" y="40" width="52" height="64" rx="4" fill="${K}"/>
      <rect x="44" y="40" width="52" height="6" fill="${G}"/><rect x="44" y="92" width="52" height="9" fill="${G}"/>
      <rect x="40" y="100" width="60" height="6" rx="3" fill="#0d0305"/>
      <path d="M70 56l4 8 9 1-6.5 6 1.6 9-8.1-4.4-8.1 4.4 1.6-9-6.5-6 9-1z" fill="${G}"/>
      <ellipse cx="70" cy="26" rx="13" ry="18" fill="${W}"/><ellipse cx="70" cy="28" rx="5" ry="14" fill="${R}"/>
      <g class="arm">
        <rect x="114" y="120" width="3.4" height="100" rx="1.7" fill="#dfe3ea"/>
        <rect x="100" y="166" width="15" height="56" rx="7.5" fill="${R}"/>
        <rect x="100" y="212" width="15" height="6" fill="${G}"/>
        <rect x="104" y="219" width="20" height="4" rx="2" fill="${G}"/>
        <circle cx="107.5" cy="226" r="7.5" fill="${W}"/>
      </g>
    </svg>`;
  }

  document.querySelectorAll('.soldier').forEach((s) => { s.innerHTML = nutcracker(); });
  const soldiers = [...document.querySelectorAll('.soldier svg')];
  const arms = soldiers.map((s) => s.querySelector('.arm'));
  const jaws = soldiers.map((s) => s.querySelector('.jaw'));
  gsap.set(arms, { svgOrigin: '107.5 168' });

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
  for (let j = 0; j < PEGS; j++) {
    const [x, y] = polar((j * 360) / PEGS, 91);
    $('#pegs').appendChild(el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 2, fill: GOLD, stroke: '#7d1121', 'stroke-width': 0.6 }));
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
  // items = [{ key, label, weight }]. Хэсэг бүр [a0, a1] градус (0° = дээд тал, цагийн зүүний дагуу).
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
    if (empty) items = Array.from({ length: 12 }, (_, i) => ({ key: i, label: '', weight: 1 }));
    const total = items.reduce((t, it) => t + it.weight, 0);
    const n = items.length;
    let a = 0;
    items.forEach((it, i) => {
      const a0 = a, a1 = a + (it.weight / total) * 360;
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

  const tableItems = (rows) => rows.map((r) => ({ key: r.table, label: r.table, weight: r.count }));
  const nameItems = (rows) => rows.map((r) => ({ key: r.id, label: r.name, weight: 1 }));

  // ---------- харуулуудын хөдөлгөөн ----------
  let march = null;
  const chomp = () => gsap.to(jaws, { y: 6, duration: 0.1, yoyo: true, repeat: 3, ease: 'power1.inOut', stagger: 0.08 });
  if (!reduce) gsap.delayedCall(3, function idleChomp() {
    if (phase === 'idle') chomp();
    gsap.delayedCall(5 + Math.random() * 3, idleChomp);
  });
  function startMarch() {
    if (reduce) return;
    if (march) march.kill();
    march = gsap.to(soldiers, { y: -8, duration: 0.22, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 0.11 });
  }
  function stopMarch() {
    if (march) march.kill();
    march = null;
    gsap.to(soldiers, { y: 0, duration: 0.2 });
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
    let lastPeg = Math.floor(gsap.getProperty(spinner, 'rotation') / (360 / PEGS));
    const tick = () => {
      const peg = Math.floor(gsap.getProperty(spinner, 'rotation') / (360 / PEGS));
      if (peg === lastPeg) return;
      lastPeg = peg;
      gsap.fromTo(pointer, { rotation: -16 }, { rotation: 0, duration: 0.18, ease: 'power2.out', overwrite: true });
    };
    const wind = 0.5, settle = 0.4;
    spinTl = gsap.timeline()
      .to(spinner, { rotation: '-=14', duration: wind, ease: 'power2.inOut' })
      .to(spinner, { rotation: target + 3, duration: Math.max(1, seconds - wind - settle), ease: 'power3.out', onUpdate: tick })
      .to(spinner, { rotation: target, duration: settle, ease: 'sine.inOut', onUpdate: tick })
      .call(done);
  }

  // хэсгийн дотор санамсаргүй цэг (ирмэгт биш)
  const thetaIn = (s) => s.a0 + (s.a1 - s.a0) * (0.2 + Math.random() * 0.6);

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
    gsap.to(['#wheel', '.soldier'], { autoAlpha: 1, duration: 0.6 });
    gsap.to(arms, { rotation: 0, duration: 0.5 });
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
    gsap.set(['#wheel', '.soldier'], { autoAlpha: 1 });
    gsap.set(arms, { rotation: 0 });
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
    spin(thetaIn(winTable), (t.tableEnd - Date.now()) / 1000, () => landTable(draw, t, winTable));
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
      spin(thetaIn(winName), (t.end - Date.now()) / 1000, () => land(draw, winName));
    });
  }

  function land(draw, s) {
    phase = 'result';
    stopMarch();
    highlight(s);
    // харуулууд сэлмээ хүрд рүү чиглүүлнэ
    gsap.to(arms, { rotation: 35, duration: 0.6, ease: 'back.out(2)', stagger: 0.1 });
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
    tl.to(['#wheel', '.soldier'], { autoAlpha: 0.1, duration: 0.6 })
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
      if (first) gsap.set(arms, { rotation: 35 });
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
