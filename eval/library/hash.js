import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { soundLibrary } from '../../src/library/soundLibrary.js';

export const DEFAULT_LIBRARY_HASH_PATH = fileURLToPath(new URL('./FROZEN.sha256', import.meta.url));

// Library v2 is the only variable of run 2: hash exactly the tracks S3–S5 select from.
export function libraryHash(library = soundLibrary) {
  const { drums, bass, melody } = library;
  return createHash('sha256').update(JSON.stringify({ drums, bass, melody })).digest('hex');
}
