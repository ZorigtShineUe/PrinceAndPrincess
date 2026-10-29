// HTML5 canvas эффектүүд: орох цас, баярын конфетти.
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fitCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);
    return ctx;
  }

  function snow(canvas) {
    const ctx = fitCanvas(canvas);
    const count = Math.round(Math.min(220, (innerWidth * innerHeight) / 9000) * (reduceMotion ? 0.3 : 1));
    const flakes = Array.from({ length: count }, () => spawn(true));

    function spawn(anywhere) {
      const r = Math.random() * 2.4 + 0.6;
      return {
        x: Math.random() * innerWidth,
        y: anywhere ? Math.random() * innerHeight : -10,
        r,
        vy: (r * 0.35 + 0.25) * (reduceMotion ? 0.4 : 1),
        phase: Math.random() * Math.PI * 2,
        sway: Math.random() * 0.6 + 0.2,
        a: Math.random() * 0.5 + 0.35,
      };
    }

    let t = 0;
    (function frame() {
      t += 0.01;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += f.vy;
        f.x += Math.sin(t * 2 + f.phase) * f.sway * 0.4;
        if (f.y > innerHeight + 10) flakes[i] = spawn(false);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(243,246,255,${f.a})`;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    })();
  }

  function confetti(canvas) {
    const ctx = fitCanvas(canvas);
    const colors = ['#d8a93b', '#f2d48a', '#f7ecd8', '#c8283d', '#8e1426', '#2a8a63'];
    let pieces = [];
    let running = false;

    function burst(originX = innerWidth / 2, originY = innerHeight * 0.35, amount = 180) {
      if (reduceMotion) amount = Math.round(amount / 4);
      for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 9 + 3;
        pieces.push({
          x: originX, y: originY,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 5,
          w: Math.random() * 8 + 5, h: Math.random() * 5 + 3,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          color: colors[(Math.random() * colors.length) | 0],
          life: 1,
        });
      }
      if (!running) loop();
    }

    function loop() {
      running = true;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      pieces = pieces.filter((p) => p.life > 0 && p.y < innerHeight + 40);
      for (const p of pieces) {
        p.vy += 0.18;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.004;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.cos(p.rot * 2)) * p.h + 1);
        ctx.restore();
      }
      if (pieces.length) requestAnimationFrame(loop);
      else {
        running = false;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
      }
    }

    return { burst };
  }

  // Арын салют: ялагчид тодорсон цагаас хойш тасралтгүй буудна
  function fireworks(canvas) {
    const ctx = fitCanvas(canvas);
    const palettes = [
      ['#f2d48a', '#ffe9b0', '#d8a93b'], // алт
      ['#ff4d64', '#c8283d', '#ffd1d8'], // улаан
      ['#3fd197', '#2a8a63', '#d8fff0'], // маргад
      ['#f7ecd8', '#ffffff', '#f2d48a'], // зааны яс
      ['#ff9ec7', '#ffd6e8', '#f2d48a'], // чихэрт чавганы дагина
    ];
    const MAX_SPARKS = reduceMotion ? 250 : 900;
    let rockets = [];
    let sparks = [];
    let running = false;
    let nextLaunch = 0;

    function launch() {
      const edge = Math.min(72, Math.max(14, innerWidth * 0.045)) + 30; // хөшгөөс зайтай
      rockets.push({
        x: edge + Math.random() * (innerWidth - edge * 2),
        y: innerHeight + 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(innerHeight * 0.011 + Math.random() * innerHeight * 0.006),
        palette: palettes[(Math.random() * palettes.length) | 0],
        type: Math.random() < 0.25 ? 'willow' : Math.random() < 0.4 ? 'ring' : 'peony',
      });
    }

    function explode(r) {
      const count = r.type === 'ring' ? 48 : r.type === 'willow' ? 70 : 80;
      const power = Math.min(innerWidth, innerHeight) * (r.type === 'willow' ? 0.0075 : 0.0095);
      for (let i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.1;
        const speed = r.type === 'ring' ? power : power * (0.35 + Math.random() * 0.65);
        sparks.push({
          x: r.x, y: r.y,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          color: r.palette[(Math.random() * r.palette.length) | 0],
          life: 1,
          decay: r.type === 'willow' ? 0.006 + Math.random() * 0.004 : 0.012 + Math.random() * 0.01,
          gravity: r.type === 'willow' ? 0.035 : 0.06,
          size: r.type === 'willow' ? 1.6 : 2.2,
          twinkle: Math.random() < 0.35,
        });
      }
    }

    function frame(t) {
      if (!running && !rockets.length && !sparks.length) {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        return;
      }
      // хуучин зургийг аажмаар бүдгэрүүлж мөр (trail) үүсгэнэ
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = 'lighter';

      if (running && t >= nextLaunch) {
        launch();
        if (!reduceMotion && Math.random() < 0.25) launch(); // заримдаа хоёрыг зэрэг
        nextLaunch = t + (reduceMotion ? 2600 : 450 + Math.random() * 900);
      }

      rockets = rockets.filter((r) => {
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.12;
        ctx.fillStyle = r.palette[0];
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (r.vy >= -1.2) {
          explode(r);
          return false;
        }
        return true;
      });

      sparks = sparks.filter((s) => {
        s.vx *= 0.985;
        s.vy = s.vy * 0.985 + s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= s.decay;
        if (s.life <= 0) return false;
        ctx.globalAlpha = s.twinkle ? s.life * (0.4 + Math.random() * 0.6) : s.life;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      const idle = !rockets.length && !sparks.length;
      running = true;
      nextLaunch = 0;
      if (idle) requestAnimationFrame(frame);
    }

    // шинэ пуужин хөөргөхөө болино, агаарт байгаа нь дуустал гэрэлтэнэ
    function stop() {
      running = false;
    }

    return { start, stop, get running() { return running; } };
  }

  window.ShineFx = { snow, confetti, fireworks, reduceMotion };
})();
