function parseIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isConfiguredEnvValue(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized !== "placeholder" && !normalized.startsWith("your-");
}

export const config = {
  maxZipSizeMb: parseIntegerEnv("MAX_ZIP_SIZE_MB", 25),
  maxTotalFiles: parseIntegerEnv("MAX_TOTAL_FILES", 1000),
  maxTotalChars: parseIntegerEnv("MAX_TOTAL_CHARS", 4_000_000),
  maxFileChars: parseIntegerEnv("MAX_FILE_CHARS", 200_000),
  githubFetchConcurrency: parseIntegerEnv("GITHUB_FETCH_CONCURRENCY", 6),
  embeddingDimension: parseIntegerEnv("EMBEDDING_DIMENSION", 768),
  defaultCitationLimit: parseIntegerEnv("DEFAULT_CITATION_LIMIT", 5),
  defaultSnippetLimit: parseIntegerEnv("DEFAULT_SNIPPET_LIMIT", 8),
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
};
