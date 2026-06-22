const STORAGE_KEY = 'sb_onboarded';

export function shouldShowOnboarding(storage) {
  return !storage.getItem(STORAGE_KEY);
}

export const TOUR_STEPS = [
  {
    selector: '.pillar-card',
    title: 'Layers',
    body: 'Each column is one layer of your track — drums, bass, melody and more.',
    placement: 'right',
  },
  {
    selector: '.pillar-card .pillar-prompt',
    title: 'Describe it',
    body: 'Type a sound or a change here in plain words. The app builds it for you.',
    placement: 'top',
  },
  {
    selector: '.pillar-card .btn-mode',
    title: 'Two modes',
    body: 'GEN makes new sounds. TRX tweaks the feel with one-tap emotion chips.',
    placement: 'bottom',
  },
  {
    selector: '#play-btn',
    title: 'Play',
    body: 'Hit play to hear all your layers together.',
    placement: 'bottom',
  },
];

// ── DOM rendering ─────────────────────────────────────────

let teardownFn = null;

function markComplete() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* storage unavailable */ }
}

function teardown() {
  if (teardownFn) { teardownFn(); teardownFn = null; }
}

// Public: always runs the flow (used for first-run and replay). Idempotent.
export function startOnboarding() {
  teardown();
  renderWelcome();
}

// Public: runs the flow only on first visit.
export function maybeStartOnboarding() {
  if (shouldShowOnboarding(localStorage)) startOnboarding();
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function renderWelcome() {
  const root = el('div', 'ob-root');
  root.innerHTML = `
    <div class="ob-backdrop"></div>
    <div class="ob-card ob-welcome" role="dialog" aria-modal="true">
      <div class="ob-kicker">WELCOME</div>
      <h2 class="ob-title">SEMANTIC BEATS</h2>
      <p class="ob-lead">Build a track by stacking layers — no music skills needed.</p>
      <ol class="ob-moves">
        <li>Pick a layer's sound</li>
        <li>Tweak it by feel or words</li>
        <li>Play</li>
      </ol>
      <div class="ob-actions">
        <button class="ob-btn ob-skip">SKIP</button>
        <button class="ob-btn ob-primary ob-start">TAKE THE TOUR</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const finish = () => { markComplete(); cleanup(); };
  const cleanup = () => { root.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') finish(); };
  document.addEventListener('keydown', onKey);

  root.querySelector('.ob-skip').addEventListener('click', finish);
  root.querySelector('.ob-start').addEventListener('click', () => { cleanup(); renderTour(); });

  teardownFn = cleanup;
}

function renderTour() {
  const root = el('div', 'ob-root');
  root.innerHTML = `
    <div class="ob-spot"></div>
    <div class="ob-tooltip" role="dialog" aria-modal="true">
      <div class="ob-step-count"></div>
      <div class="ob-step-title"></div>
      <div class="ob-step-body"></div>
      <div class="ob-actions">
        <button class="ob-btn ob-back">BACK</button>
        <button class="ob-btn ob-primary ob-adv"></button>
        <button class="ob-btn ob-skip">SKIP</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const spot = root.querySelector('.ob-spot');
  const tip = root.querySelector('.ob-tooltip');
  tip.style.visibility = 'hidden'; // stay hidden until positioned (no bottom-left flash)
  let index = 0;

  const finish = () => { markComplete(); cleanup(); };
  const cleanup = () => {
    root.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', reposition);
  };
  const onKey = (e) => { if (e.key === 'Escape') finish(); };

  function currentTarget() {
    return document.querySelector(TOUR_STEPS[index].selector);
  }

  function show() {
    // Skip steps whose target is missing; end gracefully if none remain.
    let target = currentTarget();
    while (!target && index < TOUR_STEPS.length - 1) {
      index += 1;
      target = currentTarget();
    }
    if (!target) { finish(); return; }

    const step = TOUR_STEPS[index];
    root.querySelector('.ob-step-count').textContent =
      `${String(index + 1).padStart(2, '0')} / ${String(TOUR_STEPS.length).padStart(2, '0')}`;
    root.querySelector('.ob-step-title').textContent = step.title;
    root.querySelector('.ob-step-body').textContent = step.body;
    root.querySelector('.ob-back').style.visibility = index === 0 ? 'hidden' : 'visible';
    root.querySelector('.ob-adv').textContent = index === TOUR_STEPS.length - 1 ? 'DONE' : 'NEXT';
    reposition();
  }

  function reposition() {
    const target = currentTarget();
    if (!target) return;
    const r = target.getBoundingClientRect();
    const pad = 6;
    spot.style.left = `${r.left - pad}px`;
    spot.style.top = `${r.top - pad}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;

    // Place tooltip per placement, then clamp into the viewport.
    const gap = 14;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const place = TOUR_STEPS[index].placement;
    let left, top;
    if (place === 'right')      { left = r.right + gap;            top = r.top; }
    else if (place === 'top')   { left = r.left;                   top = r.top - th - gap; }
    else /* bottom */           { left = r.left;                   top = r.bottom + gap; }
    const margin = 8;
    left = Math.max(margin, Math.min(left, window.innerWidth - tw - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - th - margin));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.visibility = 'visible';
  }

  root.querySelector('.ob-skip').addEventListener('click', finish);
  root.querySelector('.ob-back').addEventListener('click', () => {
    if (index > 0) { index -= 1; show(); }
  });
  root.querySelector('.ob-adv').addEventListener('click', () => {
    if (index >= TOUR_STEPS.length - 1) { finish(); return; }
    index += 1;
    show();
  });
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', reposition);

  teardownFn = cleanup;
  show();
  // Web fonts can load after first paint, reflowing targets — re-anchor once ready.
  document.fonts?.ready.then(reposition).catch(() => {});
}
