import {
  expect,
  it_session,
  judge,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "Water follows the table terrain and Reset clears the run",
  {
    required: true,
    scenes: ["Office"],
    recording: "canyon-carver-flow-reset",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "spout-handle" });

    const initial = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "spout-handle" });

    await session.stepFrame(60);
    const flowedTerrain = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "reset-button" });
    await session.stepFrame(8);

    const afterReset = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify water flow and reset. Required changes: Activating the spout adds visible water beads and short trails over the table contour. Reset removes the beads and trails while keeping the contour.",
      evidence: [
        { type: "image", label: "Initial terrain", image: initial },
        { type: "image", label: "Water flow result", image: flowedTerrain },
        { type: "image", label: "After Reset", image: afterReset },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "Moving the virtual outlet captures at least one bead",
  {
    required: true,
    scenes: ["Office"],
    recording: "canyon-carver-capture",
    realTime: true,
  },
  async (session) => {
    const result = await session.act(
      "Move outlet-cup to the visible end of the water path, then activate spout-handle. Stop when the outlet counter visibly reports that it captured at least one water bead.",
      { maxTurns: 36, timeoutMs: 180_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor stopped with status ${result.status}.`);
    }

    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify that moving the outlet cup to the end of the water path captures water. Required changes: The outlet cup moves, the spout releases visible water beads, and the cup's visible counter reports at least one captured bead.",
      trajectory: result.trajectory,
      evidence: [
        {
          type: "image",
          label: "Outlet after water capture",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
