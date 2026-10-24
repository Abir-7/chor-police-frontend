import { useState } from 'react';

/**
 * Client-side sound effects for game events. Every player hears the sounds of
 * the round on their own device — nothing is sent over the network.
 *
 * Assets: free SFX downloaded from Mixkit (mixkit.co), usable under the
 * Mixkit License (https://mixkit.co/license/).
 */

const SOUND_PREFERENCE_KEY = 'chor_sound_enabled';
const DEFAULT_ENABLED = true;

export type SoundEffect =
  | 'pick'
  | 'reveal'
  | 'king'
  | 'catch'
  | 'miss'
  | 'pop'
  | 'tick';

const SFX_SOURCES: Record<SoundEffect, string> = {
  pick: '/sfx/pick.mp3', // paper slip claimed
  reveal: '/sfx/reveal.mp3', // role reveal screen
  king: '/sfx/king.mp3', // Babu's command (whom to catch)
  catch: '/sfx/catch.mp3', // round end: Police caught the target
  miss: '/sfx/miss.mp3', // round end: Police missed
  pop: '/sfx/pop.mp3', // quick emoji reaction
  tick: '/sfx/tick.mp3', // ticking while Police is deciding
};

const SFX_VOLUMES: Record<SoundEffect, number> = {
  pick: 0.65,
  reveal: 0.75,
  king: 0.85,
  catch: 0.9,
  miss: 0.9,
  pop: 0.5,
  tick: 0.4,
};

let enabled = DEFAULT_ENABLED;

// Restore the persisted preference; storage may be locked/absent.
try {
  const stored = localStorage.getItem(SOUND_PREFERENCE_KEY);

  if (stored === '0' || stored === '1') {
    enabled = stored === '1';
  }
} catch {
  // Keep the default.
}

/** One Audio element per effect kept warm so playback starts instantly. */
const audioTemplates = new Map<SoundEffect, HTMLAudioElement>();

// Eagerly create + load EVERY effect at startup. Creating an Audio lazily
// (on first play) makes the very first catch/miss/reveal land late — the
// browser fetches the file over the network exactly when the drama happens.
// Preloading means clones come straight from the HTTP cache: zero delay.
try {
  (Object.keys(SFX_SOURCES) as SoundEffect[]).forEach((effect) => {
    const element = new Audio(SFX_SOURCES[effect]);
    element.preload = 'auto';
    element.load();
    audioTemplates.set(effect, element);
  });
} catch {
  // Audio API unavailable — fall back to lazy creation inside playSound.
}

export function playSound(effect: SoundEffect): void {
  if (!enabled) {
    return;
  }

  try {
    let template = audioTemplates.get(effect);

    if (!template) {
      template = new Audio(SFX_SOURCES[effect]);
      audioTemplates.set(effect, template);
    }

    // Clone so overlapping events (e.g. several reactions) never clash on
    // the same element, which would cut the previous playback short.
    const instance = template.cloneNode() as HTMLAudioElement;

    instance.volume = SFX_VOLUMES[effect];
    void instance.play().catch(() => {
      // Autoplay blocked or codec missing — sound is optional, stay silent.
    });
  } catch {
    // Audio API unavailable in this environment — ignore.
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function setSoundEnabled(value: boolean): void {
  enabled = value;

  try {
    localStorage.setItem(SOUND_PREFERENCE_KEY, value ? '1' : '0');
  } catch {
    // Some browsers block storage changes — keep in-memory only.
  }
}

/** React hook exposing the persisted sound preference with a toggle. */
export function useSoundPreference(): [boolean, (value: boolean) => void] {
  const [state, setState] = useState<boolean>(enabled);

  const update = (value: boolean) => {
    setSoundEnabled(value);
    setState(value);
  };

  return [state, update];
}
