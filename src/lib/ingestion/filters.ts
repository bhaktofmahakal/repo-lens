const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.exe', '.zip', '.tar', '.gz', '.7z', 
  '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.mov', '.avi', '.bin', '.dll', '.so', '.dylib',
  '.pyc', '.pyo', '.pyd', '.db', '.sqlite', '.sqlite3', '.class', '.jar', '.war', '.ear'
]);

const SUPPORTED_TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".env",
  ".md",
  ".txt",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".htm",
  ".xml",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".py",
  ".java",
  ".kt",
  ".kts",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".cc",
  ".cxx",
  ".c",
  ".h",
  ".hpp",
  ".swift",
  ".scala",
  ".gql",
  ".graphql",
]);

const SUPPORTED_SPECIAL_FILENAMES = new Set([
  "readme",
  "license",
  "dockerfile",
  "makefile",
  "gitignore",
  "gitattributes",
  "npmrc",
  "editorconfig",
]);

const IGNORED_DIRECTORIES = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.vercel', 'vendor', 'venv', '.venv'
]);

function getBaseName(filePath: string): string {
  const pieces = filePath.toLowerCase().split(/[\/\\]/);
  return pieces[pieces.length - 1] || "";
}

function getFileExtension(filePath: string): string {
  const baseName = getBaseName(filePath);
  const dotIndex = baseName.lastIndexOf(".");
  return dotIndex === -1 ? "" : baseName.slice(dotIndex);
}

export function isBinaryFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  if (!ext) return false;
  return BINARY_EXTENSIONS.has(ext);
}

export function isSupportedTextFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  if (ext) {
    return SUPPORTED_TEXT_EXTENSIONS.has(ext);
  }

  return SUPPORTED_SPECIAL_FILENAMES.has(getBaseName(filename));
}

export function isIgnoredPath(path: string): boolean {
  return path.split(/[\/\\]/).some(part => IGNORED_DIRECTORIES.has(part));
}

export function isTextFile(filename: string): boolean {
  return !isBinaryFile(filename);
}

const DISALLOWED_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Postgres text fields reject null/control bytes.
export function sanitizeForDatabase(text: string): string {
  return text.replace(DISALLOWED_CONTROL_CHARS, '');
}

// Catches mislabeled binary files that pass extension filters.
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
