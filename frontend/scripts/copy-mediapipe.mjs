// The hand-tracking runtime and its model are served from our own site: no camera image or request goes elsewhere.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';

const from = new URL('../node_modules/@mediapipe/hands/', import.meta.url);
const to = new URL('../public/mediapipe/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const file of readdirSync(from)) {
  if (/^hand.*\.(js|wasm|data|tflite|binarypb)$/.test(file)) cpSync(new URL(file, from), new URL(file, to));
}
