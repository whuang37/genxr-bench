import { vi } from "@xrblocks/devtools/test";

export type PostedMessage = {
  id: number;
  type: string;
  [key: string]: unknown;
};

export class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  posted: Array<{ message: PostedMessage; transfer: Transferable[] }> = [];
  terminated = false;

  constructor(public url: string) {
    FakeWorker.instances.push(this);
  }

  postMessage(message: PostedMessage, transfer: Transferable[] = []) {
    this.posted.push({ message, transfer });
  }

  reply(data: unknown) {
    this.onmessage?.({ data });
  }

  replyError(id: number, error: string) {
    this.reply({ error, id, ok: false });
  }

  replyOk(id: number, result?: unknown) {
    this.reply({ id, ok: true, result });
  }

  terminate() {
    this.terminated = true;
  }
}

export class FakeBlob {
  static instances: FakeBlob[] = [];

  constructor(
    public parts: BlobPart[],
    public options: BlobPropertyBag,
  ) {
    FakeBlob.instances.push(this);
  }
}

export function installWorkerEnvironment() {
  const revokedUrls: string[] = [];
  const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
  const createObjectURL = vi.fn(() => "blob:perception-worker");
  const createImageBitmap = vi.fn(async () => bitmap);

  FakeWorker.instances = [];
  FakeBlob.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("Blob", FakeBlob);
  vi.stubGlobal("URL", {
    createObjectURL,
    revokeObjectURL: vi.fn((url: string) => revokedUrls.push(url)),
  });
  vi.stubGlobal("createImageBitmap", createImageBitmap);

  return {
    bitmap,
    createImageBitmap,
    createObjectURL,
    restore: () => vi.unstubAllGlobals(),
    revokedUrls,
  };
}

export const INIT_CONFIG = {
  mediapipeModuleUrl: "https://example.test/vision_bundle.mjs",
  taskName: "PoseLandmarker" as const,
  taskOptions: { runningMode: "IMAGE" },
  wasmFilesUrl: "https://example.test/wasm",
};

export const IMAGE_DATA = { height: 2, width: 2 } as ImageData;

export async function loadWorkerModule() {
  return import("@xrblocks/source/world/shared/MediaPipeVisionWorker.ts");
}
