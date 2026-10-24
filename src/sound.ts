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

/** Cues generated with WebAudio, so they need no downloaded asset. */
export type SynthEffect = 'disconnect' | 'reconnect';

const SYNTH_NOTES: Record<
  SynthEffect,
  { freq: number; at: number; dur: number }[]
> = {
  // Falling three-note "bwoop": someone dropped out.
  disconnect: [
    { freq: 520, at: 0, dur: 0.16 },
    { freq: 392, at: 0.18, dur: 0.16 },
    { freq: 262, at: 0.36, dur: 0.3 },
  ],
  // Rising chime: they are back.
  reconnect: [
    { freq: 392, at: 0, dur: 0.12 },
    { freq: 523, at: 0.13, dur: 0.12 },
    { freq: 784, at: 0.26, dur: 0.26 },
  ],
};

let audioContext: AudioContext | null = null;

function playSynth(effect: SynthEffect): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!Ctor) {
      return;
    }

    audioContext ??= new Ctor();
    const ctx = audioContext;

    // Browsers suspend the context until a user gesture; this is best effort.
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const start = ctx.currentTime + 0.02;

    for (const note of SYNTH_NOTES[effect]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = note.freq;

      const t0 = start + note.at;

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + note.dur + 0.05);
    }
  } catch {
    // Audio unavailable — sound is optional.
  }
}

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

export function playSound(effect: SoundEffect | SynthEffect): void {
  if (!enabled) {
    return;
  }

  if (effect === 'disconnect' || effect === 'reconnect') {
    playSynth(effect);
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
