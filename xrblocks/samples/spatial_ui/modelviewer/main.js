import * as xb from 'xrblocks';

import {ModelViewerScene} from './ModelViewerScene.js';

document.addEventListener('DOMContentLoaded', async () => {
  const modelViewerScene = new ModelViewerScene();
  xb.add(modelViewerScene);
  const options = new xb.Options();
  options.setAppTitle('Model Viewer');
  options.world.enablePlaneDetection();
  await xb.init(options);
});
