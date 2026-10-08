import type { PhysicalHand, XRBlocksSession } from "@xrblocks/devtools";
import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Arrange circuit components in space",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "spatial-circuit-builder-arrange",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "circuit-workspace" });

    const component = await session.objects.inspect({
      tag: "movable-circuit-component",
    });
    const position = component.worldTransform.position;
    const initial = (await session.getScreenshot()) as string;
    await session.pointTo(primaryHand, { tag: "movable-circuit-component" });
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, [
      position[0] + 0.18,
      position[1] + 0.08,
      position[2],
    ]);
    await session.endSelect(primaryHand);
    await session.stepFrame(8);
    const arrangedView = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify rearranging one rigid battery, switch, resistor, or bulb. Required changes: The tagged complete component moves to a different open position and remains there without becoming a loose wire end. Judge the visible movement rather than exact coordinates.",
      evidence: [
        { type: "image", label: "Initial circuit layout", image: initial },
        { type: "image", label: "Arranged circuit", image: arrangedView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "Completing the series circuit lights the bulb and starts charge flow",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "spatial-circuit-builder",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "circuit-workspace" });
    const initial = (await session.getScreenshot()) as string;
    await connect(
      session,
      primaryHand,
      "wire-1-end-a",
      "terminal-battery-positive",
    );
    await connect(
      session,
      primaryHand,
      "wire-1-end-b",
      "terminal-switch-input",
    );
    await connect(
      session,
      primaryHand,
      "wire-2-end-a",
      "terminal-switch-output",
    );
    await connect(
      session,
      primaryHand,
      "wire-2-end-b",
      "terminal-resistor-input",
    );
    await connect(
      session,
      primaryHand,
      "wire-3-end-a",
      "terminal-resistor-output",
    );
    await connect(session, primaryHand, "wire-3-end-b", "terminal-bulb-input");
    await connect(session, primaryHand, "wire-4-end-a", "terminal-bulb-output");
    await connect(
      session,
      primaryHand,
      "wire-4-end-b",
      "terminal-battery-negative",
    );
    await session.rayClick(primaryHand, { tag: "circuit-switch" });
    await session.wait(1_000);
    const verdict = await judge({
      prompt:
        "Objective: Verify a complete battery-to-switch-to-resistor-to-bulb series circuit. Required changes: The final view shows four snapped wires forming one complete loop, a closed switch, a bulb casting warm light, and visible charge markers moving around the circuit. Judge the visible energized result rather than exact component positions or wire curves.",
      evidence: [
        { type: "image", label: "Initial loose circuit", image: initial },
        {
          type: "image",
          label: "Energized complete circuit",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function connect(
  session: XRBlocksSession,
  hand: PhysicalHand,
  wireEndTag: string,
  terminalTag: string,
): Promise<void> {
  await session.pointTo(hand, { tag: wireEndTag });
  await session.startSelect(hand);
  await session.pointTo(hand, { tag: terminalTag });
  await session.endSelect(hand);
  await session.stepFrame(6);
}
