import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../probes/', import.meta.url));

// Probe modules sorted by file name.
export async function loadProbes() {
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort();
  return Promise.all(files.map(async (f) => (await import(new URL(`../probes/${f}`, import.meta.url))).default));
}
