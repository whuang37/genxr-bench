import {
  expect,
  it_session,
  judge,
  expectNotVisible,
  expectVisible,
} from "@xrblocks/devtools/test";
import { fileURLToPath } from "node:url";

const blowAudioFixture = fileURLToPath(
  new URL("./fixtures/blow.wav", import.meta.url),
);

it_session(
  "scatters a nearby dandelion with a blow and resets it",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "blowing-dandelion",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.teleportTo({ tag: "dandelion-head" }, { distance: 0.15 });
    await session.lookAtTarget({ tag: "dandelion-head" });
    await session.wait(300);
    await session.waitForAudioConsumer({ timeoutMs: 5_000 });
    await session.injectAudio({ file: blowAudioFixture });
    await session.wait(1_200);
    await expectVisible(session, "respawn-leaf");
    const scatteredScreenshot = (await session.getScreenshot()) as string;

    await session.teleportTo({ tag: "respawn-leaf" }, { distance: 0.45 });
    await session.lookAtTarget({ tag: "respawn-leaf" });
    await session.gesture(primaryHand, "pointing");
    await session.reachTo(
      primaryHand,
      { tag: "respawn-leaf" },
      { anchor: "index-tip" },
    );
    await session.startSelect(primaryHand);
    await session.endSelect(primaryHand);
    await session.moveHand(primaryHand, { upMeters: 0.12 });
    await session.wait(500);
    const resetScreenshot = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify that blowing scatters the dandelion and that its visible leaf-shaped restart control creates a new flower. Required changes: The scattered view shows detached seeds and an empty flower head. The reset view shows a fresh flower with attached seeds.",
      evidence: [
        {
          type: "image",
          label: "Scattered view",
          image: scatteredScreenshot,
        },
        { type: "image", label: "Reset view", image: resetScreenshot },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "A distant blow keeps the seeds attached",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "blowing-dandelion-distant-blow",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(20);
    await session.waitForAudioConsumer({ timeoutMs: 5_000 });
    await session.injectAudio({ file: blowAudioFixture });
    await session.wait(700);
    await expectVisible(session, "dandelion-stem");
    await expectNotVisible(session, "respawn-leaf");
  },
);
