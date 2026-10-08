import { expect, it_session, judge } from "@xrblocks/devtools/test";

const STYLES = [
  { tag: "outline-style-button", label: "Outline" },
  { tag: "light-dark-style-button", label: "Light on dark" },
  { tag: "color-separation-style-button", label: "Color separation" },
] as const;

it_session(
  "two table clicks create a region that supports all three styles",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "semantic-translator",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);

    const tableView = await session.getPresetLocation("table-view");
    const firstCorner = await session.getPresetLocation("table-primary");
    const secondCorner = await session.getPresetLocation("table-secondary");
    await session.navigateTo(tableView);

    await session.lookAtTarget(firstCorner);
    await session.pointTo(primaryHand, firstCorner);
    await session.click(primaryHand);
    await session.stepFrame(4);

    await session.lookAtTarget(secondCorner);
    await session.pointTo(primaryHand, secondCorner);
    await session.click(primaryHand);
    await session.stepFrame(12);
    await session.lookAtTarget([
      (firstCorner[0] + secondCorner[0]) / 2,
      (firstCorner[1] + secondCorner[1]) / 2,
      (firstCorner[2] + secondCorner[2]) / 2,
    ]);

    const evidence: Array<{
      type: "image";
      label: string;
      image: string;
    }> = [];
    for (const style of STYLES) {
      await session.rayClick(primaryHand, { tag: style.tag });
      await session.stepFrame(8);
      evidence.push({
        type: "image",
        label: `${style.label} style`,
        image: (await session.getScreenshot()) as string,
      });
    }

    const verdict = await judge({
      prompt:
        "Objective: Verify all three translation styles on one table region. Required changes: Outline, Light on dark, and Color separation produce visibly different matching treatments while keeping the same table region boundaries.",
      evidence,
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
