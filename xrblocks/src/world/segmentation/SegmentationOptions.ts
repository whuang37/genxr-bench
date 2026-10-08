import {XR_BLOCKS_LOCAL_ASSETS_PATH} from '../../constants';
import {deepMerge} from '../../utils/OptionsUtils';
import {DeepPartial} from '../../utils/Types';

/**
 * Configuration options for the semantic segmentation system. Mirrors the
 * other `world/*` perception options (humans, faces, objects).
 */
export class SegmentationOptions {
  enabled = false;

  /**
   * Minimum delay in milliseconds between continuous segmentation runs.
   * A value of 0 runs again as soon as the previous inference finishes.
   * Defaults to 66 (~15 fps), the rate the magic_window grab loop used before
   * segmentation moved onto its own polling loop.
   */
  pollingIntervalMs = 66;

  /**
   * Configuration options for the active segmentation backend.
   */
  backendConfig = {
    activeBackend: 'mediapipe',
    mediapipe: {
      wasmFilesUrl:
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      // Selfie multiclass model: 0=background, 1=hair, 2=body-skin,
      // 3=face-skin, 4=clothes, 5=others (see SegmentCategory).
      modelAssetPath: `${XR_BLOCKS_LOCAL_ASSETS_PATH}models/selfie_multiclass_256x256.tflite`,
      /**
       * Output the per-pixel category mask. Required to produce a
       * {@link SegmentationMask}.
       */
      outputCategoryMask: true,
    },
  };

  constructor(options?: DeepPartial<SegmentationOptions>) {
    if (options) {
      deepMerge(this, options);
    }
  }

  enable() {
    this.enabled = true;
    return this;
  }
}
