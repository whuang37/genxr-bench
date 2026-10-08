import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Each preset selects the correct equation and surface",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "spatial-equation-grapher",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: PRESETS[0].tag });
    const evidence: Array<{
      type: "image";
      label: string;
      image: string;
    }> = [];

    for (const preset of PRESETS) {
      await session.rayClick(primaryHand, { tag: preset.tag });
      await session.stepFrame(8);
      evidence.push({
        type: "image",
        label: `${preset.name}: ${preset.equation}`,
        image: (await session.getScreenshot()) as string,
      });
    }

    const verdict = await judge({
      prompt:
        "Objective: Verify the three equation presets. Required changes: Wave shows z = a sin(x) + b cos(y), Saddle shows z = a x² - b y², and Ripple shows z = a sin(b √(x² + y²)). Each preset has one matching active surface while the axes, grid, and zero plane remain visible.",
      evidence,
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

const PRESETS = [
  {
    name: "Wave",
    equation: "z = a sin(x) + b cos(y)",
    tag: "equation-preset-wave",
  },
  {
    name: "Saddle",
    equation: "z = a x² - b y²",
    tag: "equation-preset-saddle",
  },
  {
    name: "Ripple",
    equation: "z = a sin(b √(x² + y²))",
    tag: "equation-preset-ripple",
  },
] as const;
