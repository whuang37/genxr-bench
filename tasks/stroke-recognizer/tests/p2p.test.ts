import * as THREE from "three";
import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";
import type { User } from "@xrblocks/source/core/User.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type {
  GestureRecognizer,
  PoseEstimator,
} from "@xrblocks/source/input/gestures/GestureTypes.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("keeps Options enableStrokes wiring hands, gestures, strokes, and nested stroke settings", async () => {
  vi.stubGlobal("window", { location: { search: "" } });
  const [{ Options }, { StrokeRecognitionOptions }] = await Promise.all([
    import("@xrblocks/source/core/Options.ts"),
    import("@xrblocks/source/input/strokes/StrokeRecognitionOptions.ts"),
  ]);
  const options = new Options();
  options.hands.enabled = false;
  options.gestures.enabled = false;
  options.strokes.enabled = false;
  expect(options.enableStrokes()).toBe(options);
  expect(options.hands.enabled).toBe(true);
  expect(options.gestures.enabled).toBe(true);
  expect(options.strokes.enabled).toBe(true);

  const strokeOptions = new StrokeRecognitionOptions({
    maxPoints: 12,
    providerConfig: { onedollar: { supportedShapes: ["Circle"] } },
  });
  expect(strokeOptions.maxPoints).toBe(12);
  expect(strokeOptions.providerConfig.provider).toBe("onedollar");
  expect(strokeOptions.providerConfig.onedollar.supportedShapes).toContain(
    "Circle",
  );
});

it("keeps disabled recognition inert and preserves the custom backend contract", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [
    { StrokeRecognitionOptions },
    { StrokeRecognizer },
    { StrokeRecognizerBackend },
  ] = await Promise.all([
    import("@xrblocks/source/input/strokes/StrokeRecognitionOptions.ts"),
    import("@xrblocks/source/input/strokes/StrokeRecognition.ts"),
    import("@xrblocks/source/input/strokes/StrokeRecognizerBackend.ts"),
  ]);
  const camera = new THREE.PerspectiveCamera();
  const scene = new THREE.Scene();
  const options = new StrokeRecognitionOptions({ enabled: false });
  const recognizer = new StrokeRecognizer();
  const events = vi.fn();
  recognizer.addEventListener("unistrokestart", events);
  recognizer.init({
    camera,
    scene,
    options,
    user: { isSelecting: () => true },
  } as never);
  recognizer.update();
  expect(events).not.toHaveBeenCalled();

  class CustomBackend extends StrokeRecognizerBackend {
    seen: Point2D[] = [];
    contextForTest() {
      return this.context;
    }
    recognize(points: Point2D[]) {
      this.seen = points;
      return { recognizedShape: "Custom", confidence: 0.75 };
    }
  }
  const backend = new CustomBackend({ camera, scene });
  const points = [{ x: 1, y: 2 }];
  expect(backend.contextForTest()).toEqual({ camera, scene });
  expect(backend.recognize(points)).toEqual({
    recognizedShape: "Custom",
    confidence: 0.75,
  });
  expect(backend.seen).toEqual(points);
});

it("keeps ordinary button press and completed release independent from strokes", async () => {
  installWindow();
  const [{ Interaction }, { UIButton }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/ui/components/UIButton.ts"),
  ]);
  const callbacks = new ScriptsManager(async () => {});
  const interaction = new Interaction({ callbacks });
  const clicked = vi.fn();
  const button = new UIButton({ label: "Save", onClick: clicked });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, button);
  await callbacks.initScript(button);
  const source = controller(0);

  update(interaction, [ray(source, false, surface)]);
  update(interaction, [ray(source, true, surface)]);
  update(interaction, [ray(source, false, surface)]);

  expect(clicked).toHaveBeenCalledOnce();
  expect(interaction.isSelectingAt(button)).toBe(false);
});

it("keeps button cancellation on release outside and source loss", async () => {
  installWindow();
  const [{ Interaction }, { UIButton }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/ui/components/UIButton.ts"),
  ]);
  const callbacks = new ScriptsManager(async () => {});
  const interaction = new Interaction({ callbacks });
  const clicked = vi.fn();
  const button = new UIButton({ label: "Cancel", onClick: clicked });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, button);
  await callbacks.initScript(button);
  const source = controller(0);

  update(interaction, [ray(source, true, surface)]);
  update(interaction, [ray(source, false)]);
  update(interaction, [ray(source, true, surface)]);
  update(interaction, []);

  expect(clicked).not.toHaveBeenCalled();
  expect(interaction.isSelectingAt(button)).toBe(false);
});

it("keeps manipulable card translation through its registered edge", async () => {
  installWindow();
  const [{ Interaction }, { UICard }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/ui/components/UICard.ts"),
  ]);
  const callbacks = new ScriptsManager(async () => {});
  const interaction = new Interaction({ callbacks });
  const card = new UICard({
    size: { width: 0.5, height: 0.3 },
    manipulation: true,
    edge: true,
  });
  new THREE.Scene().add(card);
  const edge = new THREE.Object3D();
  edge.xb = { manipulationHandle: { action: "translate" } };
  interaction.registerHitSurface(edge, card);
  await callbacks.initScript(card);
  const source = controller(0);

  update(interaction, [ray(source, true, edge, new THREE.Vector3())]);
  update(interaction, [ray(source, true, edge, new THREE.Vector3(0.4, 0, 0))]);

  expect(card.position.x).not.toBe(0);
});

it("keeps ordinary UI cards, panels, images, and text usable without stroke recognition", async () => {
  installWindow();
  const [{ UICard }, { UIPanel }, { UIImage }, { UIText }] = await Promise.all([
    import("@xrblocks/source/ui/components/UICard.ts"),
    import("@xrblocks/source/ui/components/UIPanel.ts"),
    import("@xrblocks/source/ui/components/UIImage.ts"),
    import("@xrblocks/source/ui/components/UIText.ts"),
  ]);
  const card = new UICard({ size: { width: 0.6, height: 0.4 } });
  const panel = new UIPanel();
  const image = new UIImage({ src: "fixture.png" });
  const text = new UIText({ text: "Status" });
  panel.add(image, text);
  card.add(panel);

  expect(card.isUI).toBe(true);
  expect(panel.isUI).toBe(true);
  expect(image.src).toBe("fixture.png");
  expect(text.text).toBe("Status");
  expect(card.children).toContain(panel);
});

it("keeps a supplied hand-gesture lifecycle usable beside strokes", async () => {
  installWindow();
  const [
    { Handedness },
    { GestureRecognition },
    { GestureRecognitionOptions },
  ] = await Promise.all([
    import("@xrblocks/source/input/Hands.ts"),
    import("@xrblocks/source/input/gestures/GestureRecognition.ts"),
    import("@xrblocks/source/input/gestures/GestureRecognitionOptions.ts"),
  ]);
  const context = {
    handedness: Handedness.RIGHT,
    handLabel: "right" as const,
    joints: new Map(),
    getJoint: () => undefined,
  };
  let confidence = 0.9;
  const estimator: PoseEstimator = {
    init: async () => {},
    getHandContext: () => context,
    getHandContexts: () => ({ right: context }),
  };
  const recognizer: GestureRecognizer = {
    getGestureConfigurations: () => ({ custom: { enabled: false } }),
    recognize: () => ({ custom: { confidence } }),
  };
  const options = new GestureRecognitionOptions({
    enabled: true,
    updateIntervalMs: 0,
    poseEstimator: estimator,
    gestureRecognizer: recognizer,
  });
  const recognition = new GestureRecognition();
  const events: string[] = [];
  recognition.addEventListener("gesturestart", () => events.push("start"));
  recognition.addEventListener("gestureupdate", () => events.push("update"));
  recognition.addEventListener("gestureend", () => events.push("end"));
  await recognition.init({ options, user: {} as User });
  options.setGestureEnabled("custom", true);

  recognition.update();
  recognition.update();
  confidence = 0;
  recognition.update();

  expect(events).toEqual(["start", "update", "end"]);
  recognition.dispose();
});

it("keeps screen selection and controller disconnection behavior beside strokes", async () => {
  installWindow();
  const { Input } = await import("@xrblocks/source/input/Input.ts");
  const input = new Input();
  const source = controller(0);
  source.userData.selected = true;
  source.gamepad = { buttons: [{ value: 0, pressed: true }] } as Gamepad;
  source.inputSource = { targetRayMode: "screen" } as XRInputSource;
  input.controllers.push(source);
  const start = vi.fn();
  const end = vi.fn();
  input.bindListener("selectstart", start);
  input.bindListener("selectend", end);

  source.dispatchEvent({ type: "selectstart", target: source });
  input.defaultOnDisconnected({ type: "disconnected", target: source });

  expect(start).toHaveBeenCalledOnce();
  expect(end).toHaveBeenCalledOnce();
  expect(source.userData.selected).toBe(false);
  input.dispose();
});

type Point2D = { x: number; y: number };

function installWindow(): void {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
}

function controller(id: number): Controller {
  const value = new THREE.Object3D() as Controller;
  value.userData = { id, connected: true, selected: false };
  return value;
}

function ray(
  source: Controller,
  selected: boolean,
  surface?: THREE.Object3D,
  position = new THREE.Vector3(),
): RaySourceInput {
  source.userData.selected = selected;
  return {
    controller: source,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(position, new THREE.Vector3(0, 0, -1)),
    position,
    orientation: new THREE.Quaternion(),
    ...(surface
      ? {
          intersections: [
            {
              distance: 1,
              object: surface,
              point: new THREE.Vector3(0, 0, -1),
              uv: new THREE.Vector2(0.5, 0.5),
            },
          ],
        }
      : {}),
  };
}

function update(
  interaction: { update(frame: InteractionFrameInput): void },
  raySources: RaySourceInput[],
): void {
  interaction.update({ raySources, directTouches: [] });
}
