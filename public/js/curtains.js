// Тайзны улаан хилэн хөшиг: хаалттай эхэлж, GSAP-ээр нээгдэнэ/хаагдана.
// Нээлттэй үед хажуу бүрт --edge өргөнтэй хэсэг үлдэж тайзыг хүрээлнэ.
(function () {
  const left = document.querySelector('.curtain.left');
  const right = document.querySelector('.curtain.right');
  let isOpen = false;

  // CSS-ийн --edge-тэй ижил: clamp(14px, 4.5vw, 72px)
  const edge = () => Math.min(72, Math.max(14, innerWidth * 0.045));
  const openX = (el) => el.offsetWidth - edge();

  function open(duration = 2.2) {
    isOpen = true;
    return gsap.timeline()
      .to(left, { x: () => -openX(left), duration, ease: 'power3.inOut' }, 0)
      .to(right, { x: () => openX(right), duration, ease: 'power3.inOut' }, 0)
      // хөшиг татагдахад үрчлээ нь бага зэрэг шахагдана
      .fromTo([left, right], { scaleY: 1 }, { scaleY: 1.015, transformOrigin: '50% 0%', duration: duration / 2, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
  }

  function close(duration = 1.4) {
    isOpen = false;
    return gsap.timeline()
      .to([left, right], { x: 0, duration, ease: 'power3.inOut' }, 0);
  }

  // цонхны хэмжээ өөрчлөгдөхөд нээлттэй хөшгийг шинэ ирмэг рүү байрлуулна
  addEventListener('resize', () => {
    if (!isOpen) return;
    gsap.set(left, { x: -openX(left) });
    gsap.set(right, { x: openX(right) });
  });

  window.ShineCurtains = { open, close, get isOpen() { return isOpen; } };
})();
