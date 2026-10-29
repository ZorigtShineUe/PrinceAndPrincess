// Проектор дээрх тодруулах дэлгэц: санал тоологдож буйг харуулаад,
// админ тодруулахад 3-2-1 тоолоод ханхүү, дараа нь гүнжийг титэмтэй нь гаргана.
(function () {
  const { api, candidateEl, markChosen } = Shine;
  const $ = (s) => document.querySelector(s);
  const adminKey = localStorage.getItem('shine2027-admin');

  ShineFx.snow($('#snow'));
  const confetti = ShineFx.confetti($('#confetti'));
  const fireworks = ShineFx.fireworks($('#fireworks'));
  const reduce = ShineFx.reduceMotion;

  const tree = ShineTree.animate(ShineTree.build($('#tree')));
  tree.pause();
  if (reduce) {
    ShineCurtains.open(0);
    tree.progress(1);
  } else {
    ShineCurtains.open();
    gsap.delayedCall(0.9, () => tree.play());
  }

  let shown = null; // одоо харагдаж буй төлөв: 'wait' | 'final'
  let playing = false;

  async function poll() {
    try {
      const s = await api('/api/status');
      $('#count').textContent = s.totalVoters;
      const note = $('#round-note');
      note.hidden = s.round.n < 2;
      if (s.round.n > 1) {
        const roles = Object.keys(s.round.roles).map((r) => (r === 'prince' ? 'ханхүүгийн' : 'гүнжийн')).join(', ');
        note.textContent = `${s.round.n}-р шат: ${roles} дахин санал хураалт`;
      }
      const timerWasRunning = deadline != null;
      deadline = s.revealed ? null : Shine.deadlineFrom(s.revealAt, s.now);
      tickTimer();
      // тоолуураар тодорсон бол тоолуур өөрөө 0 хүрсэн тул 3-2-1-ийг алгасна
      if (s.revealed && shown !== 'final' && !playing) await showWinners(shown === 'wait', timerWasRunning);
      if (!s.revealed && shown !== 'wait') showWait();
    } catch { /* дахин оролдоно */ }
  }

  // ---------- тоолуур ----------
  let deadline = null;
  let lastPollAtZero = 0;
  function tickTimer() {
    const box = $('#big-timer');
    const running = deadline != null;
    box.hidden = !running;
    $('#reveal-btn').hidden = !adminKey || running || shown !== 'wait';
    if (!running) return;
    const left = Math.max(0, deadline - Date.now());
    $('#big-timer-value').textContent = Shine.clock(left);
    box.classList.toggle('urgent', left > 0 && left <= 10000);
    if (left === 0 && Date.now() - lastPollAtZero > 1000) {
      lastPollAtZero = Date.now();
      poll();
    }
  }
  setInterval(tickTimer, 250);

  function showWait() {
    shown = 'wait';
    fireworks.stop();
    gsap.to('#final', { autoAlpha: 0, duration: 0.5 });
    gsap.to('#wait', { autoAlpha: 1, duration: 0.8 });
    tickTimer();
  }

  async function showWinners(dramatic, fromTimer) {
    playing = true;
    $('#reveal-btn').hidden = true;
    let w;
    try {
      w = await api('/api/winners');
    } catch {
      playing = false;
      return;
    }
    shown = 'final';

    const sides = {};
    for (const role of ['prince', 'princess']) {
      const box = document.querySelector(`[data-side="${role}"] .people`);
      box.innerHTML = '';
      sides[role] = w[role].map((c) => {
        const node = candidateEl(c, { votes: c.votes });
        box.appendChild(node);
        return node;
      });
      if (!w[role].length) box.innerHTML = '<p class="dept">Санал ирээгүй</p>';
    }
    const tied = [w.tie.prince && 'Ханхүүгийн', w.tie.princess && 'Гүнжийн'].filter(Boolean);
    $('#tie-note').textContent = tied.length ? `${tied.join(', ')} санал тэнцсэн тул дахин санал хураана` : '';
    gsap.set('#tie-note', { autoAlpha: 0 });

    const tl = gsap.timeline({ onComplete: () => { playing = false; } });

    if (dramatic && !reduce) {
      // хөшиг хаагдаж, хилэн дээр 3-2-1 гараад, хөшиг нээгдэхэд ялагчид тайзан дээр байна
      tl.add(ShineCurtains.close(1.4), 0)
        .to('#wait', { autoAlpha: 0, duration: 0.6 }, 0.8);
      for (const n of fromTimer ? [] : ['3', '2', '1']) {
        tl.call(() => { $('#countdown').textContent = n; })
          .set('#countdown', { autoAlpha: 1 })
          .fromTo('#countdown', { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' })
          .to('#countdown', { opacity: 0, scale: 0.7, duration: 0.45, delay: 0.25 });
      }
      tl.set('#countdown', { autoAlpha: 0 })
        .set('#final', { autoAlpha: 1 })
        .add(ShineCurtains.open(2.4))
        .from('#final h2', { opacity: 0, y: -20, duration: 0.6 }, '-=1.4');
    } else {
      tl.to('#wait', { autoAlpha: 0, duration: 0.6 })
        .set('#final', { autoAlpha: 1 })
        .from('#final h2', { opacity: 0, y: -20, duration: 0.6 });
    }
    // хөшиг нээгдэх үеэс арын салют тасралтгүй буудна
    tl.call(() => fireworks.start(), null, '<');

    const d = reduce ? 0.01 : 1;
    ['prince', 'princess'].forEach((role, idx) => {
      const head = `[data-side="${role}"] h3`;
      tl.set(head, { visibility: 'visible' })
        .from(head, { opacity: 0, y: 20, duration: 0.5 * d }, idx ? '+=1.4' : '+=0.2')
        .fromTo(sides[role], { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.8 * d, ease: 'back.out(1.6)', stagger: 0.2 })
        .call(() => {
          sides[role].forEach((n) => markChosen(n, true));
          const box = document.querySelector(`[data-side="${role}"]`).getBoundingClientRect();
          confetti.burst(box.left + box.width / 2, box.top + box.height * 0.35, 200);
        });
    });
    tl.call(() => confetti.burst(innerWidth / 2, innerHeight * 0.2, 260), null, '+=1.2');
    if (tied.length) tl.fromTo('#tie-note', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 });
  }

  // админ энэ компьютер дээр нэвтэрсэн бол проектороос шууд тоолуур эхлүүлж болно
  $('#reveal-btn').addEventListener('click', async () => {
    try {
      await api('/api/admin/countdown', { method: 'POST', headers: { 'x-admin-key': adminKey } });
      poll();
    } catch (err) {
      alert(err.message);
    }
  });

  gsap.set('#final', { autoAlpha: 0 });
  poll();
  setInterval(poll, 2500);
})();
