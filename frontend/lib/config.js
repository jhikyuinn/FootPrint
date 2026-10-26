// Server addresses. On a real device localhost is the device itself, so set these to the
// PC's IP in frontend/.env.local (see README), then restart `npx expo start`.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:1206";
export const GUN_PEER = process.env.EXPO_PUBLIC_GUN_PEER || "http://localhost:8765/gun";
