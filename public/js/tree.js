// Гацуур мод: krishnachoudhary1969/Merry-Christmas (MIT) хөдөлгөөнийг үндэс болгосон.
// Оч мод даган урсаж, DrawSVG-ээр модыг зурна, оройд нь сургуулийн лого тодорно.
// Зурж дууссаны дараа давхарга бүрт гирлянд, чимэглэл өлгөгдөнө.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const PARTICLE_COLORS = ['#f7ecd8', '#f2d48a', '#d8a93b', '#ffffff', '#c8283d', '#2a8a63', '#ffe9b0', '#b51f36'];
  const PARTICLE_TYPES = ['#xt-star', '#xt-circ', '#xt-cross', '#xt-heart'];
  const NUM_PARTICLES = 201;
  const ORN_COLORS = ['#c8283d', '#f7ecd8', '#2a8a63', '#f2d48a'];

  // Давхарга бүрийн гирлянд (модны дотор талаар унжсан муруй) ба чимэглэлийн тоо
  const GARLANDS = [
    { d: 'M346 196 Q408 234 470 196', count: 3 },
    { d: 'M302 300 Q405 352 506 306', count: 5 },
    { d: 'M276 396 Q405 456 534 398', count: 6 },
  ];
  // Мөчрүүдийн гадна үзүүрүүд (модны зам дээрх булангууд)
  const TIPS = [
    [326, 240], [489, 240], [281, 336], [524, 359], [256, 450], [557, 451],
  ];
  const GLYPHS = ['Σ', '√', 'π', '∞', 'Δ'];

  gsap.registerPlugin(MotionPathPlugin, DrawSVGPlugin, Physics2DPlugin);

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function ornament(parent, x, y, r, color, glyph) {
    const g = el('g', { class: 'ornament' }, parent);
    el('line', { class: 'string', x1: x, y1: y, x2: x, y2: y + 8 }, g);
    el('rect', { x: x - r * 0.38, y: y + 6, width: r * 0.76, height: 3.4, rx: 1, fill: '#f2d48a' }, g);
    const cy = y + 9 + r;
    el('circle', { cx: x, cy, r, fill: glyph ? '#0e3d2c' : color, stroke: glyph ? '#d8a93b' : 'none', 'stroke-width': 1.4 }, g);
    el('circle', { cx: x - r * 0.35, cy: cy - r * 0.35, r: r * 0.28, fill: '#fff', opacity: 0.55 }, g);
    if (glyph) {
      const t = el('text', { class: 'orn-glyph', x, y: cy + 0.5 }, g);
      t.textContent = glyph;
    }
    g.dataset.ox = x;
    g.dataset.oy = y;
    return g;
  }

  function build(svg) {
    svg.setAttribute('viewBox', '200 15 420 530');
    svg.innerHTML = window.SHINE_TREE_SVG;
    const q = (s) => svg.querySelector(s);
    const whole = q('.whole');

    // гирлянд, чимэглэл
    const decor = el('g', { class: 'xt-decor' }, whole);
    whole.insertBefore(decor, q('.treeStar'));
    const garlands = [];
    const bulbs = [];
    const ornaments = [];
    let n = 0;
    GARLANDS.forEach((gl) => {
      const path = el('path', { class: 'garland', d: gl.d }, decor);
      garlands.push(path);
      const len = path.getTotalLength();
      for (let i = 0; i < 9; i++) {
        const p = path.getPointAtLength((len * (i + 0.5)) / 9);
        bulbs.push(el('circle', { class: 'bulb', cx: p.x, cy: p.y, r: 2.6 }, decor));
      }
      for (let i = 0; i < gl.count; i++) {
        const p = path.getPointAtLength((len * (i + 0.5)) / gl.count);
        const glyph = i % 2 === 1 ? GLYPHS[n % GLYPHS.length] : null;
        ornaments.push(ornament(decor, p.x, p.y, glyph ? 10 : 7, ORN_COLORS[n % ORN_COLORS.length], glyph));
        n++;
      }
    });
    TIPS.forEach(([x, y], i) => ornaments.push(ornament(decor, x, y, 8, ORN_COLORS[(i + 1) % ORN_COLORS.length], null)));

    return {
      svg,
      whole,
      pContainer: q('.pContainer'),
      sparkle: q('.sparkle'),
      treePath: q('.treePath'),
      treeBottomPath: q('.treeBottomPath'),
      star: q('.treeStar'),
      starOutline: q('.treeStarOutline'),
      logo: q('.treeLogo'),
      garlands,
      bulbs,
      ornaments,
    };
  }

  function animate(parts, onDone) {
    const { svg, whole, pContainer, sparkle } = parts;
    const movers = [pContainer, sparkle];
    const pool = [];
    let count = 0;
    let showParticle = true;
    const getScale = gsap.utils.random(0.5, 3, 0.001, true);

    gsap.set(svg, { visibility: 'visible' });
    gsap.set(sparkle, { transformOrigin: '50% 50%', y: -100 });

    for (let i = NUM_PARTICLES - 1; i >= 0; i--) {
      const p = svg.querySelector(PARTICLE_TYPES[i % PARTICLE_TYPES.length]).cloneNode(true);
      p.removeAttribute('id');
      p.setAttribute('fill', PARTICLE_COLORS[i % PARTICLE_COLORS.length]);
      p.setAttribute('class', 'particle');
      whole.appendChild(p);
      pool.push(p);
      gsap.set(p, { x: -100, y: -100, transformOrigin: '50% 50%' });
    }

    function flicker(p) {
      gsap.killTweensOf(p, { opacity: true });
      gsap.fromTo(p, { opacity: 1 }, { duration: 0.07, opacity: Math.random(), repeat: -1 });
    }

    function playParticle() {
      if (!showParticle) return;
      const p = pool[count];
      gsap.set(p, { x: gsap.getProperty(pContainer, 'x'), y: gsap.getProperty(pContainer, 'y'), scale: getScale() });
      gsap.to(p, {
        duration: gsap.utils.random(0.61, 6),
        physics2D: {
          velocity: gsap.utils.random(-23, 23),
          angle: gsap.utils.random(-180, 180),
          gravity: gsap.utils.random(-6, 50),
        },
        scale: 0,
        rotation: gsap.utils.random(-123, 360),
        ease: 'power1',
        onStart: flicker,
        onStartParams: [p],
      });
      count = (count + 1) % NUM_PARTICLES;
    }

    const bottomStart = MotionPathPlugin.getRawPath(parts.treeBottomPath)[0];

    // оч модны замаар явж, дараа нь доод шугамаар гүйнэ
    const starTl = gsap.timeline({ onUpdate: playParticle });
    starTl
      .to(movers, { duration: 6, motionPath: { path: parts.treePath, autoRotate: false }, ease: 'linear' })
      .to(movers, {
        duration: 1,
        onStart: () => { showParticle = false; },
        x: bottomStart[0],
        y: bottomStart[1],
      })
      .to(movers, {
        duration: 2,
        onStart: () => { showParticle = true; },
        motionPath: { path: parts.treeBottomPath, autoRotate: false },
        ease: 'linear',
      })
      .from(svg.querySelector('.treeBottomMask'), { duration: 2, drawSVG: '0% 0%', stroke: '#FFF', ease: 'linear' }, '-=2')
      .call(() => { showParticle = false; });

    const mainTl = gsap.timeline({
      onComplete: () => {
        idle(parts);
        if (onDone) onDone();
      },
    });
    mainTl
      .from([svg.querySelector('.treePathMask'), svg.querySelector('.treePotMask')], {
        drawSVG: '0% 0%',
        stroke: '#FFF',
        stagger: { each: 6 },
        duration: gsap.utils.wrap([6, 1, 2]),
        ease: 'linear',
      })
      .from(parts.star, { duration: 3, scaleY: 0, scaleX: 0.15, transformOrigin: '50% 50%', ease: 'elastic(1,0.5)' }, '-=4')
      .to(sparkle, {
        duration: 3,
        opacity: 0,
        ease: 'rough({strength: 2, points: 100, template: linear, taper: both, randomize: true, clamp: false})',
      })
      .from(parts.garlands, { drawSVG: '0%', duration: 0.9, stagger: 0.3, ease: 'sine.inOut' }, '-=3.2')
      .from(parts.bulbs, { opacity: 0, duration: 0.15, stagger: 0.02 }, '-=2.4')
      .from(parts.ornaments, { scale: 0, transformOrigin: '50% 0%', duration: 0.6, stagger: 0.06, ease: 'back.out(2.5)' }, '-=2.2')
      .to(parts.starOutline, {
        duration: 1,
        opacity: 1,
        ease: 'rough({strength: 2, points: 16, template: linear, taper: none, randomize: true, clamp: false})',
      }, '+=0.3');
    mainTl.add(starTl, 0);
    mainTl.timeScale(1.5);
    return mainTl;
  }

  // Зурж дууссаны дараах тайван хөдөлгөөн: гэрэл анивчих, чимэглэл найгах, лого гэрэлтэх
  function idle(parts) {
    if (window.ShineFx && ShineFx.reduceMotion) return;
    parts.bulbs.forEach((b, i) => {
      gsap.to(b, { opacity: 0.25, duration: gsap.utils.random(0.5, 1.2), repeat: -1, yoyo: true, delay: (i % 7) * 0.17, ease: 'sine.inOut' });
    });
    parts.ornaments.forEach((o) => {
      gsap.to(o, {
        rotation: gsap.utils.random(-6, 6), svgOrigin: `${o.dataset.ox} ${o.dataset.oy}`,
        duration: gsap.utils.random(1.6, 2.6), repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
    });
    gsap.to(parts.starOutline, { scale: 1.08, opacity: 0.5, transformOrigin: '50% 50%', duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  window.ShineTree = { build, animate };
})();
