export const CAMERA_FRAME_WIDTH = 1280;
export const CAMERA_FRAME_HEIGHT = 720;
export const CAMERA_ASPECT_RATIO = CAMERA_FRAME_WIDTH / CAMERA_FRAME_HEIGHT;
export const MONITOR_FRAME_WIDTH = 640;
export const MONITOR_FRAME_HEIGHT = 360;

export const USER_FACING_CAMERA_CONSTRAINTS = {
  facingMode: "user",
  width: { ideal: CAMERA_FRAME_WIDTH },
  height: { ideal: CAMERA_FRAME_HEIGHT },
  aspectRatio: { ideal: CAMERA_ASPECT_RATIO },
};

export function drawVideoFrameCover(video, canvas, options = {}) {
  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    return false;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const targetWidth = Number(options.width) || CAMERA_FRAME_WIDTH;
  const targetHeight = Number(options.height) || CAMERA_FRAME_HEIGHT;
  const targetAspect = targetWidth / targetHeight;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = sourceWidth;
  let sHeight = sourceHeight;

  if (sourceAspect > targetAspect) {
    sWidth = sourceHeight * targetAspect;
    sx = (sourceWidth - sWidth) / 2;
  } else if (sourceAspect < targetAspect) {
    sHeight = sourceWidth / targetAspect;
    sy = (sourceHeight - sHeight) / 2;
  }

  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  return true;
}
