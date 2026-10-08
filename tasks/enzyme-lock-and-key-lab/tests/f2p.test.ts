import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "A compatible substrate can be moved toward its enzyme site",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "enzyme-lock-and-key-lab",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "enzyme-stands" });

    expect(await session.objects.findByTag("enzyme-stands")).toHaveLength(1);
    const initial = (await session.getScreenshot()) as string;
    await session.reachTo(primaryHand, { tag: "test-substrate" });
    await session.startSelect(primaryHand);
    await session.rotateHand(primaryHand, { rollDegrees: 90 });
    await session.stepFrame(4);
    await session.reachTo(primaryHand, { tag: "compatible-enzyme-site" });
    await session.stepFrame(4);
    await session.endSelect(primaryHand);
    await session.stepFrame(8);

    const placedView = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify compatible substrate placement. Required changes: The tagged substrate moves away from its tray, rotates into visible green alignment, snaps into the compatible enzyme site, and remains there after release. Judge the visible placement and alignment change rather than exact coordinates.",
      evidence: [
        { type: "image", label: "Initial enzyme workspace", image: initial },
        { type: "image", label: "Compatible placement", image: placedView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "An incompatible substrate placement shows red clash feedback",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "enzyme-lock-and-key-lab-incompatible",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "enzyme-stands" });
    const initial = (await session.getScreenshot()) as string;
    await session.pointTo(primaryHand, { tag: "test-substrate" });
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, { tag: "incompatible-enzyme-site" });
    await session.stepFrame(8);
    const clashView = (await session.getScreenshot()) as string;
    await session.endSelect(primaryHand);
    const verdict = await judge({
      prompt:
        "Objective: Verify incompatible substrate rejection. Required changes: Moving the tagged substrate from its tray to the incompatible site produces visible red clash feedback and does not show a successful snap. Judge the visible feedback rather than exact coordinates.",
      evidence: [
        { type: "image", label: "Initial enzyme workspace", image: initial },
        { type: "image", label: "Incompatible placement", image: clashView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
