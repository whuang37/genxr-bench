import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";

import { AudioPlayer } from "@xrblocks/source/sound/AudioPlayer.ts";

type ScheduledSource = {
  buffer: { duration: number } | null;
  end: () => void;
  startTime?: number;
  stopped: boolean;
  stop: () => void;
};

class FakeAudioContext {
  currentTime = 5;
  state = "running";
  destination = {};
  closed = false;
  readonly sources: ScheduledSource[] = [];

  createGain() {
    return { gain: { value: 1 }, connect: vi.fn() };
  }

  createBuffer(_channels: number, length: number, sampleRate: number) {
    return {
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }

  createBufferSource() {
    let onended: (() => void) | null = null;
    const source: ScheduledSource & { onended: (() => void) | null } = {
      buffer: null,
      stopped: false,
      get onended() {
        return onended;
      },
      set onended(callback) {
        onended = callback;
      },
      connect: vi.fn(),
      start(time: number) {
        source.startTime = time;
      },
      end() {
        onended?.();
      },
      stop() {
        source.stopped = true;
      },
    };
    this.sources.push(source);
    return source;
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    this.closed = true;
    for (const source of this.sources) source.stop();
    return Promise.resolve();
  }
}

function pcmChunk(sampleCount: number) {
  return btoa("\0".repeat(sampleCount * 2));
}

function installAudioContext(contexts: FakeAudioContext[]) {
  vi.stubGlobal(
    "AudioContext",
    class extends FakeAudioContext {
      constructor() {
        super();
        contexts.push(this);
      }
    },
  );
}

afterEach(() => vi.unstubAllGlobals());

it("keeps jittered PCM chunks continuously scheduled on the audio clock", async () => {
  const contexts: FakeAudioContext[] = [];
  installAudioContext(contexts);
  const player = new AudioPlayer({ sampleRate: 100, channelCount: 1 });

  await player.playAudioChunk(pcmChunk(10));
  contexts[0].currentTime = 5.03;
  await player.playAudioChunk(pcmChunk(20));
  contexts[0].currentTime = 5.07;
  await player.playAudioChunk(pcmChunk(5));

  const scheduled = contexts[0].sources.map((source) => ({
    start: source.startTime!,
    end: source.startTime! + source.buffer!.duration,
  }));
  expect(scheduled).toHaveLength(3);
  expect(scheduled[0].start).toBeGreaterThanOrEqual(5);
  expect(scheduled[0].start).toBeLessThanOrEqual(5.01);
  expect(scheduled[2].end - scheduled[0].start).toBeGreaterThan(0.349);
  expect(scheduled[2].end - scheduled[0].start).toBeLessThan(0.351);
  for (let index = 1; index < scheduled.length; index += 1) {
    expect(
      Math.abs(scheduled[index].start - scheduled[index - 1].end),
    ).toBeLessThan(0.001);
  }

  player.dispose();
});

it("reports an underrun honestly and resumes when a later chunk arrives", async () => {
  const contexts: FakeAudioContext[] = [];
  installAudioContext(contexts);
  const player = new AudioPlayer({ sampleRate: 100 });

  await player.playAudioChunk(pcmChunk(10));
  contexts[0].currentTime = 5.1;
  expect(player.getIsPlaying()).toBe(false);

  contexts[0].currentTime = 5.4;
  await player.playAudioChunk(pcmChunk(10));
  expect(player.getIsPlaying()).toBe(true);
  expect(contexts[0].sources.at(-1)!.startTime).toBeCloseTo(5.4, 6);

  player.dispose();
});

it("stops scheduled audio and permits a fresh stream", async () => {
  const contexts: FakeAudioContext[] = [];
  installAudioContext(contexts);
  const player = new AudioPlayer({ sampleRate: 100 });

  await player.playAudioChunk(pcmChunk(20));
  const stoppedContext = contexts[0];
  const staleSource = stoppedContext.sources[0];
  expect(stoppedContext.sources).toHaveLength(1);
  expect(stoppedContext.sources.some((source) => source.stopped)).toBe(false);

  player.stop();

  expect(stoppedContext.closed || staleSource.stopped).toBe(true);

  await player.playAudioChunk(pcmChunk(20));
  const freshSource = contexts.flatMap((context) => context.sources).at(-1)!;
  expect(freshSource).not.toBe(staleSource);
  expect(freshSource.stopped).toBe(false);
  expect(player.getIsPlaying()).toBe(true);

  staleSource.end();
  expect(player.getIsPlaying()).toBe(true);

  player.dispose();
});
