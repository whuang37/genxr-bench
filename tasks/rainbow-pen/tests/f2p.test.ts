import { expect, it_session, judge } from "@xrblocks/devtools/test";
import type { PhysicalHand, XRBlocksSession } from "@xrblocks/devtools";

it_session(
  "either hand draws while Undo and Reset remove strokes",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "rainbow-pen-controls",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(20);
    await session.rotate({ yawDegrees: 180 });
    await session.stepFrame(8);
    const initialView = (await session.getScreenshot()) as string;

    await drawStroke(session, primaryHand);
    await drawStroke(session, secondaryHand);
    const twoStrokeView = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "undo-button" });
    await session.stepFrame(8);
    const undoView = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "reset-button" });
    await session.stepFrame(8);
    const resetView = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify drawing, Undo, and Reset. Required changes: Drawing from both hands creates two persistent strokes. Undo removes only the newer stroke, and Reset removes the remaining stroke.",
      evidence: [
        { type: "image", label: "Initial empty state", image: initialView },
        { type: "image", label: "Two drawn strokes", image: twoStrokeView },
        { type: "image", label: "After Undo", image: undoView },
        { type: "image", label: "After Reset", image: resetView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "moving the opposite fist inward and outward changes stroke width",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "rainbow-pen-width",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(20);
    await session.rotate({ yawDegrees: 180 });
    await session.stepFrame(8);

    // Inward is right for the left hand and left for the right hand.
    const outwardDirection = secondaryHand === "left" ? -1 : 1;
    await session.gesture(secondaryHand, "fist");
    await session.moveHand(secondaryHand, {
      rightMeters: -outwardDirection * 0.2,
    });
    await session.gesture(secondaryHand, "relaxed");
    await drawStroke(session, primaryHand);
    const thinView = (await session.getScreenshot()) as string;

    // Move from the inward position to an equally far outward position.
    await session.gesture(secondaryHand, "fist");
    await session.moveHand(secondaryHand, {
      rightMeters: outwardDirection * 0.4,
    });
    await session.gesture(secondaryHand, "relaxed");
    await session.moveHand(primaryHand, { rightMeters: -0.25, upMeters: 0.15 });
    await drawStroke(session, primaryHand);
    const thickView = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Compare stroke widths. Required changes: Moving the opposite fist inward produces one clearly thin stroke. Moving that fist outward produces a second, clearly thicker stroke of similar length while the thin stroke remains unchanged.",
      evidence: [
        { type: "image", label: "Thin stroke after inward fist", image: thinView },
        {
          type: "image",
          label: "Thick stroke after outward fist",
          image: thickView,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "moving the opposite fist down and up changes stroke saturation",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "rainbow-pen-saturation",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(20);
    await session.rotate({ yawDegrees: 180 });
    await session.stepFrame(8);

    await session.gesture(secondaryHand, "fist");
    await session.moveHand(secondaryHand, { upMeters: -0.2 });
    await session.gesture(secondaryHand, "relaxed");
    await drawStroke(session, primaryHand);
    const lowSaturationView = (await session.getScreenshot()) as string;

    // Move from the low position to an equally high position.
    await session.gesture(secondaryHand, "fist");
    await session.moveHand(secondaryHand, { upMeters: 0.4 });
    await session.gesture(secondaryHand, "relaxed");
    await session.moveHand(primaryHand, { rightMeters: -0.25, upMeters: 0.15 });
    await drawStroke(session, primaryHand);
    const highSaturationView = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Compare color saturation. Required changes: Moving the opposite fist down produces one visibly muted, low-saturation stroke. Moving that fist up produces a second, more vivid and saturated stroke of similar width while the first stroke remains unchanged.",
      evidence: [
        {
          type: "image",
          label: "Low-saturation stroke after downward fist",
          image: lowSaturationView,
        },
        {
          type: "image",
          label: "High-saturation stroke after upward fist",
          image: highSaturationView,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function drawStroke(
  session: XRBlocksSession,
  hand: PhysicalHand,
): Promise<void> {
  await session.gesture(hand, "pinching");
  await session.moveHand(hand, { rightMeters: 0.25 });
  await session.gesture(hand, "relaxed");
  await session.stepFrame(8);
}
