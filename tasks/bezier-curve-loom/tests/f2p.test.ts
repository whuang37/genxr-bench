import {
  expect,
  it_session,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "Moving one curve handle visibly reshapes the connected curve",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "bezier-curve-loom",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(10);
    const handles = await session.objects.findByTag("curve-handle");
    expect(handles.length).toBeGreaterThan(0);
    await session.lookAtTarget({ tag: "curve-handle", id: handles[0].id });

    const initial = (await session.getScreenshot()) as string;

    const result = await session.act(
      "Use the controller ray to grab one visible curve-handle. Move it a clear distance in more than one direction while holding it, then release it at a visibly different position. Watch how the strand and its tangent guides respond during the movement. Do not move the other handle, select Reset, or try to complete the pattern. Stop after the handle is released and the reshaped curve remains visible.",
      { maxTurns: 24, timeoutMs: 80_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Curve actor stopped: ${result.status}`);
    }

    const changed = (await session.getScreenshot()) as string;
    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify that moving one control handle reshapes the strand like a cubic Bezier curve. Required changes: One handle moves to a clearly different position and remains there after release. During the move, the strand deforms smoothly and continuously, its fixed start and end points stay fixed, and the nearby tangent or control guide follows the moved handle. The result must be a curved strand rather than a rigid translation, straight segment, or disconnected redraw. Pattern completion is not required.",
      trajectory: result.trajectory,
      evidence: [
        { type: "image", label: "Initial curve pattern", image: initial },
        { type: "image", label: "Curve after handle move", image: changed },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
