export const VISION_VERSION = "0.1.0";

export { type VisionClient, type VisionResult } from "./vision.js";
export { createVisionClient } from "./vision.js";
export { type CameraClient, createCameraClient } from "./camera.js";
export { analyzeImageSchema, ocrSchema, screenDescribeSchema } from "./schemas.js";

import type { KorvidConfig } from "@korvid/shared";
import { createVisionClient, type VisionClient } from "./vision.js";
import { createCameraClient, type CameraClient } from "./camera.js";

export function createDefaultVision(config: KorvidConfig): VisionClient {
  return createVisionClient({
    visionModel: config.models.vision?.model,
    visionApiUrl: config.models.vision?.baseUrl,
  });
}

export function createDefaultCamera(config: KorvidConfig): CameraClient {
  return createCameraClient({
    visionModel: config.models.vision?.model,
  });
}
