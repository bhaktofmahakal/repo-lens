const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.exe', '.zip', '.tar', '.gz', '.7z', 
  '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.mov', '.avi', '.bin', '.dll', '.so', '.dylib',
  '.pyc', '.pyo', '.pyd', '.db', '.sqlite', '.sqlite3', '.class', '.jar', '.war', '.ear'
]);

const IGNORED_DIRECTORIES = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.vercel', 'vendor', 'venv', '.venv'
]);

export function isBinaryFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return BINARY_EXTENSIONS.has(ext);
}

export function isIgnoredPath(path: string): boolean {
  return path.split(/[\/\\]/).some(part => IGNORED_DIRECTORIES.has(part));
}

export function isTextFile(filename: string): boolean {
  return !isBinaryFile(filename);
}

const DISALLOWED_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Supabase/Postgres text columns reject \u0000 and can fail on certain control characters.
 * Keep newlines/tabs intact, strip only unsafe control bytes.
 */
export function sanitizeForDatabase(text: string): string {
  return text.replace(DISALLOWED_CONTROL_CHARS, '');
}

/**
 * Extension filtering misses edge-cases (unknown extensions, misnamed files).
 * Use a small content heuristic to skip likely-binary payloads.
 */
export function isProbablyBinaryContent(text: string): boolean {
  if (text.includes('\u0000')) return true;
  if (!text) return false;

  const sample = text.slice(0, 4096);
  let controlCount = 0;

  for (const ch of sample) {
    const code = ch.charCodeAt(0);
    const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
    const isUnsafeControl = code < 32 && !isAllowedWhitespace;

    if (isUnsafeControl || code === 127) {
      controlCount++;
    }
  }

  return controlCount / sample.length > 0.02;
}
