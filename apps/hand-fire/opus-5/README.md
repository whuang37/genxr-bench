# Hand Fire

A two-hand elemental toy built on the XR Blocks SDK. A blue flame burns above
the tracked left palm and an orange flame above the tracked right palm.
Pinching one hand concentrates only that hand's flame into a bright fingertip
stream. Holding both streams together for one second merges them into a
temporary fire orb with a success ring.

## Run

```sh
npm run dev   # serves this directory on http://127.0.0.1:5173
```

- Desktop simulator: `http://127.0.0.1:5173/?formFactor=desktop`
- XR headset: open `http://<host>:5173/` and use the Enter XR button (AR).

## Controls

| Surface   | Action                                                       |
| --------- | ------------------------------------------------------------ |
| Simulator | POSE mode. Move a hand with the mouse, cycle its pose to     |
|           | `Pinching` in the hand-pose panel, and toggle the active hand.|
| Headset   | Pinch thumb to index on either hand; bring both pinched      |
|           | fingertips together.                                         |

## Behavior

- First state: a blue palm flame on the left hand and an orange palm flame on
  the right hand, inside the simulator reach volume.
- Pinch: only the pinched hand switches to a bright concentrated stream. The
  other hand keeps its current form.
- Merge: both streams within 14 cm continuously for 1 second spawn one fire orb
  with a success ring between the hands.
- Orb: holds for 5 seconds, or clears as soon as both hands open after it
  appeared. Both palm flames return.
- Cancel: separating either stream before 1 second resets the merge timer and
  leaves both flames in their current form.

## Files

- `main.js` – `HandFire` script: hand tracking, pinch resolution, orb placement.
- `flames.js` – `Flame` particle system and `FireOrb` merged effect.
- `mergeState.js` – pure timed two-hand merge state machine.
