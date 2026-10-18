// Direction-aware page navigation; Map keeps it pinned while browsing cafes.
(() => {
  const dock = document.getElementById('navDock');
  const nav = document.getElementById('bottomNav');
  const reveal = document.getElementById('navReveal');
  const page = document.scrollingElement;
  const positions = new Map();
  let pinned = false;

  function show(visible) {
    dock.classList.toggle('nav-is-collapsed', !visible);
    nav.inert = !visible;
    nav.setAttribute('aria-hidden', String(!visible));
    reveal.inert = visible;
    reveal.setAttribute('aria-hidden', String(visible));
    reveal.setAttribute('aria-expanded', String(visible));
  }

  function reset() {
    positions.clear();
    positions.set(page, { y: Math.max(0, page.scrollTop), direction: 0, distance: 0 });
    show(true);
  }

  document.addEventListener('scroll', event => {
    if (pinned) return;
    const el = event.target === document ? page : event.target;
    if (el !== page) return;
    // Scrolling inside a drink dialog shouldn't change the navigation behind it.
    if (!document.getElementById('detailModal').classList.contains('hidden')) return;
    const y = Math.max(0, Math.min(el.scrollTop, el.scrollHeight - el.clientHeight));
    const previous = positions.get(el) || { y: 0, direction: 0, distance: 0 };
    const delta = y - previous.y;
    if (!delta) return;
    const direction = Math.sign(delta);
    const distance = (direction === previous.direction ? previous.distance : 0) + Math.abs(delta);
    positions.set(el, { y, direction, distance });
    if (y <= 20 || (direction < 0 && distance >= 12)) show(true);
    else if (direction > 0 && distance >= 36 && !nav.querySelector(':focus-visible')) show(false);
  }, { capture: true, passive: true });

  reveal.addEventListener('click', event => {
    reset();
    if (event.detail === 0) (nav.querySelector('[aria-current="page"]') || nav.querySelector('button'))?.focus({ preventScroll: true });
  });
  let width = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth !== width) { width = window.innerWidth; reset(); }
  }, { passive: true });
  window.BottomNav = { reset, setPinned(value) { pinned = Boolean(value); reset(); } };
  reset();
})();
