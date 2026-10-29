// Нүүр хуудас: гацуур мод зурагдана → 5 секундын дараа ханхүү, гүнжийн санал хураалт нээгдэнэ.
(function () {
  const INTRO_HOLD = 5; // мод зурагдаж дууссанаас хойш хүлээх секунд
  const ROLE_LABEL = { prince: 'Ханхүү', princess: 'Гүнж' };
  // шат бүрт тусдаа (дахин санал хураалтад дахин санал өгнө). Саналыг устгахад шатны id шинэчлэгдэнэ.
  const votedKey = () => `shine2027-voted-${state.round.id}`;
  const { api, candidateEl, markChosen, fullName, esc } = Shine;

  const $ = (s) => document.querySelector(s);
  const stage = $('#stage');
  const ballot = $('#ballot');
  const tray = $('#tray');
  const skip = $('#skip');
  const dialog = $('#confirm');
  const desktop = window.matchMedia('(min-width: 900px)');

  ShineFx.snow($('#snow'));
  gsap.set(tray, { y: 0, yPercent: 110 });
  const confetti = ShineFx.confetti($('#confetti'));
  const fireworks = ShineFx.fireworks($('#fireworks'));

  const OTHER_DEPT = 'Бусад';
  let candidates = [];
  let departments = [];
  let state = null;
  const picks = { prince: null, princess: null };
  let entered = false;
  let holdCall = null;

  const loadLists = () => Promise.all([api('/api/candidates'), api('/api/departments')]).then(([c, d]) => {
    candidates = c;
    departments = d;
  });
  const dataReady = Promise.all([loadLists(), api('/api/status')]).then(([, s]) => {
    state = s;
  });

  // ---------- интро ----------
  const parts = ShineTree.build($('#tree'));
  const intro = ShineTree.animate(parts, () => {
    holdCall = gsap.delayedCall(INTRO_HOLD, enterVoting);
  });
  intro.from('.stage-title .greet', { opacity: 0, y: 16, duration: 0.8 }, 1.2)
    .from('.stage-title .year', { opacity: 0, letterSpacing: '0.4em', duration: 1.2, ease: 'power3.out' }, 1.6);

  // Балетын эхлэл шиг: хөшиг нээгдэж эхлэхэд мод зурагдаж эхэлнэ
  intro.pause();
  if (ShineFx.reduceMotion) {
    ShineCurtains.open(0);
    intro.progress(1);
  } else {
    ShineCurtains.open();
    gsap.delayedCall(0.9, () => intro.play());
  }

  skip.addEventListener('click', () => {
    if (!ShineCurtains.isOpen) ShineCurtains.open(0.6);
    intro.progress(1);
    enterVoting();
  });

  // ---------- интро → санал хураалт ----------
  async function enterVoting() {
    if (entered) return;
    entered = true;
    if (holdCall) holdCall.kill();
    gsap.to(skip, { autoAlpha: 0, duration: 0.3 });

    try {
      await dataReady;
    } catch (err) {
      renderError(err);
      return;
    }
    markLocalVote();
    syncTimer();

    const d = ShineFx.reduceMotion ? 0 : 1.1;
    document.body.classList.add('voting');
    if (desktop.matches) {
      const treeW = Math.min(innerWidth * 0.3, innerHeight * 0.46, 380);
      gsap.fromTo(stage, { width: innerWidth }, { width: innerWidth * 0.4, duration: d, ease: 'power3.inOut', clearProps: 'width' });
      gsap.to('.stage-tree', { width: treeW, duration: d, ease: 'power3.inOut', clearProps: 'width' });
    } else {
      gsap.fromTo(stage, { opacity: 1 }, { opacity: 0.14, duration: d, clearProps: 'opacity' });
    }

    render();
    gsap.fromTo(ballot, { autoAlpha: 0, x: desktop.matches ? 40 : 0, y: desktop.matches ? 0 : 30 },
      { autoAlpha: 1, x: 0, y: 0, duration: d * 0.8, delay: d * 0.5, ease: 'power2.out' });
    gsap.fromTo(ballot.querySelectorAll('.candidate, .dept-item'), { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, delay: d * 0.8, clearProps: 'opacity,visibility,transform' });

    setInterval(poll, 4000);
    setInterval(tickTimer, 250);
  }

  // ---------- тоолуур ----------
  let deadline = null;
  let lastPollAtZero = 0;
  function syncTimer() {
    deadline = state.revealed ? null : Shine.deadlineFrom(state.revealAt, state.now);
    tickTimer();
  }

  function tickTimer() {
    const box = $('#timer');
    document.body.classList.toggle('has-timer', deadline != null);
    if (deadline == null) {
      box.hidden = true;
      return;
    }
    const left = Math.max(0, deadline - Date.now());
    box.hidden = false;
    $('#timer-value').textContent = Shine.clock(left);
    box.classList.toggle('urgent', left > 0 && left <= 10000);
    // хугацаа дуусмагц серверээс ялагчдыг нэн даруй асууна
    if (left === 0 && Date.now() - lastPollAtZero > 1500) {
      lastPollAtZero = Date.now();
      poll();
    }
  }

  function markLocalVote() {
    state.alreadyVotedHere = !state.myVote && !!localStorage.getItem(votedKey());
  }

  // Одоогийн шатанд санал хураагдаж буй төрлүүд ба тэдгээрийн нэр дэвшигчид
  const openRoles = () => Object.keys(state.round.roles);
  function contenders(role) {
    const ids = state.round.roles[role];
    return candidates.filter((c) => c.role === role && (!ids || ids.includes(c.id)));
  }

  function render() {
    if (state.revealed) return renderWinners();
    fireworks.stop(); // тодруулгыг нуусан эсвэл дахин санал хураалт эхэлсэн
    if (state.myVote || state.alreadyVotedHere) return renderThanks();
    if (!state.votingOpen) return renderClosed();
    renderBallot();
  }

  // ---------- санал өгөх хуудас ----------
  function renderBallot() {
    const roles = openRoles();
    picks.prince = picks.princess = null;
    const runoff = state.round.n > 1;
    const names = roles.map((r) => ROLE_LABEL[r].toLowerCase()).join(', ');
    ballot.innerHTML = `
      <header class="ballot-head">
        <h2>${runoff ? 'Дахин санал хураалт' : 'Ханхүү, Гүнж 2027'}</h2>
        <p>${runoff
          ? `Санал тэнцсэн тул тэнцсэн нэр дэвшигчдээс ${names} сонгоно уу. Энэ шатанд дахин нэг л удаа санал өгнө.`
          : 'Нэг ханхүү, нэг гүнжийг сонгоод саналаа өгнө үү. Нэг хүн нэг л удаа санал өгнө.'}</p>
      </header>
      ${roles.map((r) => round(r, ROLE_LABEL[r])).join('')}`;
    document.querySelectorAll('.tray-picks [data-pick]').forEach((el) => { el.hidden = !roles.includes(el.dataset.pick); });

    for (const role of roles) {
      if (!contenders(role).length) {
        stepBox(role).innerHTML = `<p class="dept">Нэр дэвшигч хараахан бүртгэгдээгүй байна.</p>`;
      } else if (runoff) {
        // дахин санал хураалтад тэнхим сонгохгүй — тэнцсэн хүмүүс дэлгэцийг тэнцүү хуваана
        renderPeople(role, null);
      } else {
        renderDepts(role);
      }
    }
    updateTray();
  }

  function round(role, title) {
    return `<section class="round" aria-labelledby="h-${role}" data-round="${role}">
      <h3 id="h-${role}">${title} <small>${state.round.n > 1 ? 'нэгийг сонгоно' : 'эхлээд тэнхимээ сонгоно'}</small></h3>
      <div class="step" data-step="${role}"></div>
    </section>`;
  }

  const stepBox = (role) => ballot.querySelector(`[data-step="${role}"]`);
  const deptName = (c) => c.department || OTHER_DEPT;

  // Тэнхимүүд админы жагсаасан дарааллаар, жагсаалтад байхгүй нь араас, тэнхимгүй нь «Бусад»
  function deptGroups(role) {
    const groups = new Map();
    for (const d of departments) groups.set(d, []);
    for (const c of contenders(role)) {
      if (!groups.has(deptName(c))) groups.set(deptName(c), []);
      groups.get(deptName(c)).push(c);
    }
    return [...groups].filter(([, list]) => list.length);
  }

  // 1-р алхам: тэнхим сонгох
  function renderDepts(role, focusDept) {
    const box = stepBox(role);
    const pick = picks[role];
    box.innerHTML = `<ul class="dept-menu">${deptGroups(role).map(([name, list]) => {
      const here = pick && deptName(pick) === name;
      return `<li><button type="button" class="dept-item${here ? ' has-pick' : ''}" data-dept="${esc(name)}">
        <span class="dept-name">${esc(name)}</span>
        <span class="dept-meta">${here ? `<b>✓ ${esc(fullName(pick))}</b> сонгогдсон` : `${list.length} нэр дэвшигч`}</span>
        <span class="chev" aria-hidden="true">›</span>
      </button></li>`;
    }).join('')}</ul>`;
    box.querySelectorAll('.dept-item').forEach((b) =>
      b.addEventListener('click', () => {
        renderPeople(role, b.dataset.dept);
        slideIn(box, 1);
        box.querySelector('.back-btn').focus({ preventScroll: true });
      }));
    if (focusDept != null) {
      const btn = [...box.querySelectorAll('.dept-item')].find((b) => b.dataset.dept === focusDept);
      if (btn) btn.focus({ preventScroll: true });
    }
  }

  // 2-р алхам: тухайн тэнхимийн нэр дэвшигчид (dept === null бол бүгд — дахин санал хураалт)
  function renderPeople(role, dept) {
    const box = stepBox(role);
    const items = contenders(role).filter((c) => dept == null || deptName(c) === dept);
    box.innerHTML = `${dept == null ? '' : `<div class="step-bar">
        <button type="button" class="back-btn">‹ Буцах</button>
        <span class="step-dept">${esc(dept)}</span>
      </div>`}<ul class="candidates"></ul>`;
    const list = box.querySelector('.candidates');
    if (dept == null) {
      list.classList.add('split');
      list.style.setProperty('--cols', Math.max(items.length, 1));
    }
    for (const c of items) {
      const li = document.createElement('li');
      const btn = candidateEl(c, { tag: 'button' });
      btn.setAttribute('aria-label', `${c.lastName} ${c.firstName}, ${c.department}`);
      btn.addEventListener('click', () => choose(role, c, btn, list));
      li.appendChild(btn);
      list.appendChild(li);
      if (picks[role] && picks[role].id === c.id) markChosen(btn, true, true);
    }
    list.classList.toggle('has-choice', !!list.querySelector('.chosen'));
    const back = box.querySelector('.back-btn');
    if (back) {
      back.addEventListener('click', () => {
        renderDepts(role, dept);
        slideIn(box, -1);
      });
    }
  }

  // алхам солигдох хөдөлгөөн: урагш бол баруунаас, буцахад зүүнээс
  // (visibility биш opacity — гарын товчлуурын фокус алдагдахгүй)
  function slideIn(box, dir) {
    if (ShineFx.reduceMotion) return;
    gsap.fromTo(box.children, { opacity: 0, x: 28 * dir }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out', clearProps: 'opacity,transform' });
    gsap.fromTo(box.querySelectorAll('.dept-item, .candidate'), { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, delay: 0.08, clearProps: 'opacity,transform' });
  }

  function choose(role, c, btn, list) {
    const prev = list.querySelector('.candidate.chosen');
    if (prev === btn) {
      markChosen(btn, false);
      picks[role] = null;
    } else {
      if (prev) markChosen(prev, false);
      markChosen(btn, true);
      picks[role] = c;
    }
    list.classList.toggle('has-choice', !!list.querySelector('.chosen'));
    updateTray();
    // ханхүүгээ сонгосон бол гүнжийн хэсэг рүү зөөлөн гүйлгэнэ
    const next = openRoles().find((r) => r !== role && !picks[r]);
    if (picks[role] && next) {
      setTimeout(() => ballot.querySelector(`[data-round="${next}"]`)
        .scrollIntoView({ behavior: ShineFx.reduceMotion ? 'auto' : 'smooth', block: 'start' }), 700);
    }
  }

  let trayShown = false;
  function updateTray() {
    $('#pick-prince').textContent = picks.prince ? fullName(picks.prince) : 'сонгоогүй';
    $('#pick-princess').textContent = picks.princess ? fullName(picks.princess) : 'сонгоогүй';
    $('#submit').disabled = !openRoles().every((r) => picks[r]);
    const show = !!(picks.prince || picks.princess);
    if (show !== trayShown) {
      trayShown = show;
      gsap.to(tray, { yPercent: show ? 0 : 110, duration: 0.45, ease: 'power3.out' });
    }
  }

  $('#submit').addEventListener('click', () => {
    for (const role of ['prince', 'princess']) {
      $(`#confirm-${role}`).textContent = picks[role] ? fullName(picks[role]) : '';
      $(`#confirm-${role}`).parentElement.hidden = !openRoles().includes(role);
    }
    $('#confirm-error').textContent = '';
    dialog.showModal();
  });

  $('#confirm-yes').addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Илгээж байна…';
    try {
      const body = {};
      for (const role of openRoles()) body[role + 'Id'] = picks[role].id;
      state = await api('/api/vote', { method: 'POST', body });
      localStorage.setItem(votedKey(), '1');
      dialog.close();
      hideTray();
      renderThanks();
      confetti.burst(innerWidth * (desktop.matches ? 0.7 : 0.5), innerHeight * 0.4, 140);
    } catch (err) {
      $('#confirm-error').textContent = err.message;
      if (/аль хэдийн/.test(err.message)) {
        localStorage.setItem(votedKey(), '1');
        state.alreadyVotedHere = true;
        setTimeout(() => { dialog.close(); hideTray(); render(); }, 1600);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Санал өгөх';
    }
  });

  function hideTray() {
    trayShown = false;
    gsap.to(tray, { yPercent: 110, duration: 0.4 });
  }

  // ---------- баярлалаа ----------
  function renderThanks() {
    hideTray();
    const mine = state.myVote;
    ballot.innerHTML = `
      <div class="notice">
        <h2>${state.round.n > 1 ? 'Дахин санал хураалтад өгсөн саналаа бүртгүүллээ' : 'Таны санал бүртгэгдлээ'}</h2>
        <p>Баярлалаа! Хамгийн олон санал авсан ханхүү, гүнжийг шинэ жилийн баяр дээр тодруулна. Тодруулсны дараа энэ хуудсанд автоматаар харагдана.</p>
        <div class="my-picks"></div>
      </div>`;
    if (!mine) return;
    const box = ballot.querySelector('.my-picks');
    for (const id of [mine.princeId, mine.princessId]) {
      const c = id && candidates.find((x) => x.id === id);
      if (!c) continue;
      const node = candidateEl(c);
      box.appendChild(node);
      markChosen(node, true, true);
    }
  }

  function renderClosed() {
    hideTray();
    ballot.innerHTML = `
      <div class="notice">
        <h2>Санал хураалт хаагдсан</h2>
        <p>Ханхүү, гүнжийг удахгүй тодруулна. Тодруулсны дараа энэ хуудсанд автоматаар харагдана.</p>
      </div>`;
  }

  // ---------- ялагчид ----------
  async function renderWinners() {
    hideTray();
    let w;
    try {
      w = await api('/api/winners');
    } catch (err) {
      return renderError(err);
    }
    ballot.innerHTML = `
      <div class="notice">
        <h2>2027 оны Ханхүү, Гүнж</h2>
        <p>${w.tie.prince || w.tie.princess
          ? `${[w.tie.prince && 'Ханхүүгийн', w.tie.princess && 'Гүнжийн'].filter(Boolean).join(', ')} санал тэнцсэн байна.`
          : 'Баяр хүргэе!'}</p>
        <div class="winners">
          ${group('Ханхүү', 'prince')}
          ${group('Гүнж', 'princess')}
        </div>
      </div>`;
    for (const role of ['prince', 'princess']) {
      const box = ballot.querySelector(`[data-win="${role}"]`);
      if (!w[role].length) box.insertAdjacentHTML('beforeend', '<p class="dept">Санал ирээгүй</p>');
      w[role].forEach((c, i) => {
        const node = candidateEl(c, { votes: c.votes });
        box.appendChild(node);
        gsap.delayedCall(0.4 + i * 0.3, () => markChosen(node, true));
      });
    }
    confetti.burst(innerWidth * (desktop.matches ? 0.7 : 0.5), innerHeight * 0.35, 220);
    fireworks.start(); // ялагчид харагдаж байх хугацаанд тасралтгүй
  }

  function group(title, role) {
    return `<div class="winner-group" data-win="${role}"><h3>${title}</h3></div>`;
  }

  function renderError(err) {
    gsap.set(ballot, { autoAlpha: 1 });
    ballot.innerHTML = `<div class="notice"><h2>Холбогдож чадсангүй</h2>
      <p>${esc(err.message)}.</p></div>`;
  }

  // ---------- шинэчлэл ----------
  async function poll() {
    try {
      const s = await api('/api/status');
      const prev = state;
      state = s;
      markLocalVote();
      syncTimer();
      // шинэ шат (дахин санал хураалт) эхэлсэн, эсвэл тодруулга/нээлттэй байдал өөрчлөгдсөн
      const changed = s.revealed !== prev.revealed || s.round.id !== prev.round.id
        || (s.votingOpen !== prev.votingOpen && !s.myVote && !s.alreadyVotedHere);
      if (changed) {
        if (!s.revealed && s.votingOpen) await loadLists();
        render();
      }
    } catch {
      /* сүлжээ түр тасарсан — дараагийн удаа дахин оролдоно */
    }
  }
})();
