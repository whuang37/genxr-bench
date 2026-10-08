import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";

import { AudioPlayer } from "@xrblocks/source/sound/AudioPlayer.ts";

class FakeAudioContext {
  currentTime = 2;
  state = "running";
  destination = {};
  closed = false;
  readonly gain = { value: 1 };
  readonly starts: number[] = [];

  createGain() {
    return { gain: this.gain, connect: vi.fn() };
  }

  createBuffer(_channels: number, length: number, sampleRate: number) {
    return {
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }

  createBufferSource() {
    const context = this;
    return {
      buffer: null,
      connect: vi.fn(),
      onended: null,
      start(time: number) {
        context.starts.push(time);
      },
    };
  }

  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

function pcmChunk(sampleCount: number) {
  return btoa("\0".repeat(sampleCount * 2));
}

afterEach(() => vi.unstubAllGlobals());

it("starts one normal PCM buffer at the current audio time", async () => {
  const contexts: FakeAudioContext[] = [];
  vi.stubGlobal(
    "AudioContext",
    class extends FakeAudioContext {
      constructor() {
        super();
        contexts.push(this);
      }
    },
  );
  const player = new AudioPlayer({ sampleRate: 100 });

  await player.playAudioChunk(pcmChunk(20));
  expect(contexts[0].starts).toHaveLength(1);
  expect(contexts[0].starts[0]).toBeCloseTo(2, 6);
  expect(player.getIsPlaying()).toBe(true);

  player.dispose();
});

it("applies clamped public volume changes to the active stream", async () => {
  let context: FakeAudioContext | undefined;
  vi.stubGlobal(
    "AudioContext",
    class extends FakeAudioContext {
      constructor() {
        super();
        context = this;
      }
    },
  );
  const player = new AudioPlayer({ sampleRate: 100 });

  player.setVolume(1.5);
  await player.playAudioChunk(pcmChunk(1));
  expect(context!.gain.value).toBe(1);
  player.setVolume(-0.5);
  expect(context!.gain.value).toBe(0);

  player.dispose();
});

it("keeps empty audio input as a no-op", async () => {
  const AudioContext = vi.fn();
  vi.stubGlobal("AudioContext", AudioContext);
  const player = new AudioPlayer();

  await player.playAudioChunk("");

  expect(AudioContext).not.toHaveBeenCalled();
  expect(player.getQueueLength()).toBe(0);
  player.dispose();
});
