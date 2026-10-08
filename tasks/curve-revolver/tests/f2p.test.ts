import {
  expect,
  it_session,
  judge,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "Editing and sweeping the profile creates a visible revolved solid",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "curve-revolver",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "sweep-tab" });
    const beforeEdit = (await session.getScreenshot()) as string;

    const result = await session.act(
      "Move one visible profile-node to a different visible half-unit profile-grid-point. Release it after it snaps into place. Stop when the profile-radius-preview is visible. Do not activate sweep-tab.",
      { maxTurns: 28, timeoutMs: 80_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor did not complete: ${result.status}`);
    }

    const afterEdit = (await session.getScreenshot()) as string;
    const editVerdict = await judge({
      prompt:
        "Objective: Verify editing the two-dimensional outline that will be rotated into a solid. Required changes: One control point moves and snaps to a different marked grid point, and the connected outline and its visible distance-to-axis preview update with it.",
      evidence: [
        { type: "image", label: "Before profile edit", image: beforeEdit },
        { type: "image", label: "After profile edit", image: afterEdit },
      ],
    });
    expect(editVerdict.verdict, editVerdict.reason).toBe(true);

    await session.rayClick(primaryHand, { tag: "sweep-tab" });
    await session.stepFrame(30);
    const afterSweep = (await session.getScreenshot()) as string;
    const sweepVerdict = await judge({
      prompt:
        "Objective: Verify rotating the edited two-dimensional outline around its fixed axis to form a solid. Required changes: The outline becomes a clear three-dimensional solid, with green areas inside the target shell and amber feedback where it extends outside.",
      evidence: [
        { type: "image", label: "Edited profile", image: afterEdit },
        { type: "image", label: "Swept solid", image: afterSweep },
      ],
    });
    expect(sweepVerdict.verdict, sweepVerdict.reason).toBe(true);
  },
);
