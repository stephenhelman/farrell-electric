/** Quote render gallery limits — shared by the upload-token route, the attach action and the picker. */
export const RENDER_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const RENDER_MAX_BYTES = 10 * 1024 * 1024;
export const RENDER_MAX_COUNT = 12;
