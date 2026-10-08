# XR Blocks

[![NPM Package](https://img.shields.io/npm/v/xrblocks)](https://www.npmjs.com/package/xrblocks)
[![jsDelivr npm hits](<https://img.shields.io/jsdelivr/npm/hw/xrblocks?label=jsdelivr%20(npm)>)](https://www.jsdelivr.com/package/npm/xrblocks)
[![jsDelivr GitHub hits](<https://img.shields.io/jsdelivr/gh/hw/google/xrblocks?label=jsdelivr%20(GitHub)>)](https://www.jsdelivr.com/package/gh/google/xrblocks)
[![arXiv](https://img.shields.io/badge/arXiv-2509.25504-b31b1b.svg)](https://arxiv.org/abs/2509.25504)

#### JavaScript library for rapid XR prototyping

[Site](https://xrblocks.github.io/) &mdash;
[Manual](https://xrblocks.github.io/docs/) &mdash;
[Templates](https://xrblocks.github.io/docs/templates/Basic/) &mdash;
[Demos](https://xrblocks.github.io/docs/samples/) &mdash;
[YouTube](https://www.youtube.com/watch?v=75QJHTsAoB8) &mdash;
[arXiv](https://arxiv.org/abs/2509.25504)

### Description

**XR Blocks** is a lightweight, cross-platform library for rapidly prototyping
advanced XR experiences. Built upon [three.js](https://threejs.org), it
targets Chrome v136+ with WebXR support on Android XR (e.g.,
[Galaxy XR](https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/), [XREAL Aura](https://www.xreal.com/aura)) and also
includes a powerful desktop simulator for development. The framework emphasizes
a user-centric, developer-friendly SDK designed to simplify the creation of
immersive applications with features like:

- **Hand Tracking & Gestures:** Access advanced hand tracking, custom gestures
  with TensorFlow Lite / PyTorch models, and interaction events.
- **Hand Gesture Recognition:** Opt into pinch, open-palm, fist, thumbs-up, point,
  and spread detection with `options.enableGestures()`, tune providers or
  thresholds, and subscribe to `gesturestart`/`gestureupdate`/`gestureend`
  events from the shared subsystem.
- **Head Gesture Recognition:** Detect completed nod and shake motions with
  `options.enableHeadGestures()` and subscribe through
  `xb.input.headGestures` on device or in the desktop simulator.
- **World Understanding:** Present samples with depth sensing, geometry-aware
  physics, planes, scene meshes, object recognition, human pose, face landmarks,
  and semantic segmentation in XR and the desktop simulator.
- **Unified Interaction:** Use one target and capture pipeline for mouse, gaze,
  hand rays, controllers, direct touch, spatial UI, and object manipulation.
- **Built-in Spatial UI:** Compose world-space cards and view-space overlays from
  flex-layout panels, text, images, icons, buttons, sliders, and themes.
- **Agent Context:** Expose an agent-facing scene context with semantic trees,
  visible-object state, and Set-of-Mark screenshots through `xb.context`.
- **Cross-Platform:** Write once and deploy to both XR devices and desktop
  Chrome browsers.

We welcome all contributors to foster an XR community! Read our
[blog post](https://research.google/blog/xr-blocks-accelerating-ai-xr-innovation/)
and [white paper](https://arxiv.org/abs/2509.25504) for a visionary roadmap.

### Usage

[![Build Size](https://badgen.net/bundlephobia/minzip/xrblocks)](https://bundlephobia.com/result?p=xrblocks)

XR Blocks can be imported directly into a webpage using an importmap. This code
creates a basic XR scene containing a cylinder. When you view the scene, you can
pinch your fingers (in XR) or click (in the desktop simulator) to change the
cylinder's color. Check out
[this live demo](https://xrblocks.github.io/docs/templates/Basic/) with simple
code below:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Basic Example | XR Blocks</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, user-scalable=no"
    />
    <link
      type="text/css"
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/google/xrblocks@main/samples/main.css"
    />
    <script type="importmap">
      {
        "imports": {
          "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js",
          "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/",
          "three-pathfinding": "https://cdn.jsdelivr.net/npm/three-pathfinding@1.3.0/dist/three-pathfinding.module.js",
          "xrblocks": "https://cdn.jsdelivr.net/gh/google/xrblocks@build/xrblocks.js",
          "xrblocks/addons/": "https://cdn.jsdelivr.net/gh/google/xrblocks@build/addons/"
        }
      }
    </script>
  </head>
  <body>
    <script type="module">
      import * as THREE from 'three';
      import * as xb from 'xrblocks';

      /**
       * A basic example of XR Blocks to render a cylinder and pinch to change its color.
       */
      class MainScript extends xb.Script {
        init() {
          // Add a simple light to the scene.
          this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));

          // Create the 3D object.
          const geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 32);
          const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
          });
          this.player = new THREE.Mesh(geometry, material);

          // Position the object in front of the user.
          this.player.position.set(
            0,
            xb.user.height - 0.5,
            -xb.user.objectDistance
          );
          this.add(this.player);
        }

        /**
         * Changes the color of the mesh on a pinch or click.
         */
        onSelectEnd(event) {
          this.player.material.color.set(Math.random() * 0xffffff);
        }
      }

      // When the page content is loaded, add our script and initialize XR Blocks.
      document.addEventListener('DOMContentLoaded', function () {
        xb.add(new MainScript());
        xb.init(new xb.Options());
      });
    </script>
  </body>
</html>
```

### Development Guide

#### Setup

```bash
# Clone the repository.
git clone --depth=1 git@github.com:google/xrblocks.git
cd xrblocks

# Install dependencies, download runtime assets, and build the SDK.
npm ci --ignore-scripts
npm run download:assets
npm run build
```

After setup, either serve the samples and demos or develop locally, as described
below.

#### Serve samples and demos

Serve the repository to view samples and demos through `http://localhost:8080/`:

```bash
# Serve the repository on http://localhost:8080
npm run serve
```

#### Develop locally

For active SDK development, run watch mode and local serving together:

```bash
# Build the SDK in watch mode and serve the repository on http://localhost:8080
npm run dev
```

#### Linting and formatting

XR Blocks uses ESLint for linting and Prettier for formatting. Run the following
commands to check your code before submitting a pull request:

```bash
npm run lint # ESLint check
npm run format # Prettier format
```

If you are using VS Code, install the
[ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
and the
[Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode),
then set Prettier as your default formatter.

#### Devtools

For agent-first development tools, including UI and 3D model visualizers,
command-line embodied XR Blocks runners, and automatic agent controls, see
[XR Blocks Devtools](https://github.com/xrblocks/xrblocks-devtools).

#### Notice

This is not an officially supported Google product, but will be actively
maintained by the XR Labs team and external collaborators. This project is not
eligible for the
[Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security).

### User Data & Permissions

When using specific features in this SDK (e.g., WebXR, hand tracking, camera),
users will be prompted with permission requests and the application may not
function as expected with denied permissions.

XR Blocks is an open source software development kit that does not handle data
by itself; however, the use of other APIs may collect user data and require user
permissions:

When using [WebXR](https://immersive-web.github.io/) and
[LiteRT](https://ai.google.dev/edge/litert) APIs (e.g., depth sensing, gesture
recognition), all data is stored and processed locally with on-device models.

### Uninstallation

To remove XR Blocks from your code, simply remove the lines from your `<script
type="importmap">` tag in HTML, or `import * from xrblocks` in JavaScript, or
use `npm uninstall xrblocks` from your project directory.

### References

If you find XR Blocks inspiring or useful in your research, please reference it
as:

```bibtex
@misc{Li2025XR,
  title={{XR Blocks: Accelerating Human-centered AI + XR Innovation}},
  author={Li, David and Numan, Nels and Qian, Xun and Chen, Yanhe and Zhou, Zhongyi and Alekseev, Evgenii and Lee, Geonsun and Cooper, Alex and Xia, Min and Chung, Scott and Nelson, Jeremy and Yuan, Xiuxiu and Dias, Jolica and Bettridge, Tim and Hersh, Benjamin and Huynh, Michelle and Piascik, Konrad and Cabello, Ricardo and Kim, David and Du, Ruofei},
  year={2025},
  eprint={2509.25504},
  archivePrefix={arXiv},
  primaryClass={cs.HC},
  url={https://arxiv.org/abs/2509.25504},
}
```

### Terms of Service

- Please follow
  [Google's Privacy & Terms](https://policies.google.com/privacy?hl=en-US)
  when using this SDK.
