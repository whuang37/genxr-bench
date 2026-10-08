import {XR_BLOCKS_LOCAL_ASSETS_PATH} from '../../constants';
import {deepMerge} from '../../utils/OptionsUtils';
import {DeepPartial} from '../../utils/Types';

/**
 * Configuration options for the ObjectDetector.
 */
export class ObjectsOptions {
  debugging = false;
  enabled = false;
  showDebugVisualizations = false;

  /**
   * Minimum delay in milliseconds between continuous object detection runs.
   * A value of 0 runs again as soon as the previous detection finishes.
   */
  pollingIntervalMs = 0;

  /**
   * Margin to add when cropping the object image, as a percentage of image
   * size.
   */
  objectImageMargin = 0.05;

  /** Configuration for the on-device MediaPipe detector. */
  backendConfig = {
    mediapipe: {
      wasmFilesUrl:
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm',
      modelAssetPath: `${XR_BLOCKS_LOCAL_ASSETS_PATH}models/efficientdet_lite2.tflite`,
      scoreThreshold: 0.5,
    },
  };

  constructor(options?: DeepPartial<ObjectsOptions>) {
    if (options) {
      deepMerge(this, options);
    }
  }

  /**
   * Enables the object detector.
   */
  enable() {
    this.enabled = true;
    return this;
  }
}
