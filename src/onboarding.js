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
