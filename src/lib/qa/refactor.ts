import { Chunk, Citation, RefactorSuggestion } from "@/types";

type ParsedCitation = {
  filePath: string;
  startLine: number;
  endLine: number;
};

type ParsedSuggestion = {
  title: string;
  rationale: string;
  expectedImpact: string;
  citations: ParsedCitation[];
};

const SUGGESTION_STOPWORDS = new Set([
  "the",
  "is",
  "are",
  "was",
  "were",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "for",
  "in",
  "on",
  "with",
  "by",
  "this",
  "that",
  "use",
  "using",
  "more",
  "improve",
  "improved",
  "current",
  "implementation",
  "code",
  "method",
]);

const QUESTION_STOPWORDS = new Set([
  "the",
  "is",
  "are",
  "was",
  "were",
  "how",
  "what",
  "where",
  "when",
  "why",
  "which",
  "who",
  "whom",
  "whose",
  "a",
  "an",
  "of",
  "to",
  "for",
  "from",
  "in",
  "on",
  "by",
  "with",
  "and",
  "or",
  "as",
  "it",
  "this",
  "that",
  "implemented",
  "handled",
]);

function citationKey(filePath: string, startLine: number, endLine: number): string {
  return `${filePath}::${startLine}::${endLine}`;
}

function coerceInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

function extractJsonCandidate(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
  }

  return null;
}

function tokenize(text: string, stopwords: Set<string>): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s./:-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !stopwords.has(term));
}

function normalizeParsedSuggestions(value: unknown): ParsedSuggestion[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const rawSuggestions = Array.isArray(record.suggestions) ? record.suggestions : Array.isArray(value) ? value : [];
  if (!Array.isArray(rawSuggestions)) return [];

  return rawSuggestions
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const suggestion = item as Record<string, unknown>;
      const title = typeof suggestion.title === "string" ? suggestion.title.trim() : "";
      const rationale = typeof suggestion.rationale === "string" ? suggestion.rationale.trim() : "";
      const expectedImpact =
        typeof suggestion.expectedImpact === "string" ? suggestion.expectedImpact.trim() : "";
      const rawCitations = Array.isArray(suggestion.citations) ? suggestion.citations : [];

      const citations: ParsedCitation[] = rawCitations
        .map((rawCitation) => {
          if (!rawCitation || typeof rawCitation !== "object") return null;
          const citation = rawCitation as Record<string, unknown>;
          const filePath = typeof citation.filePath === "string" ? citation.filePath.trim() : "";
          const startLine = coerceInteger(citation.startLine);
          const endLine = coerceInteger(citation.endLine);
          if (!filePath || startLine === null || endLine === null) return null;
          return { filePath, startLine, endLine };
        })
        .filter((citation): citation is ParsedCitation => Boolean(citation));

      if (!title || !rationale || !expectedImpact) return null;
      return { title, rationale, expectedImpact, citations };
    })
    .filter((suggestion): suggestion is ParsedSuggestion => Boolean(suggestion));
}

function isLineRangeOverlapping(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function resolveCitation(parsed: ParsedCitation, snippets: Citation[]): Citation | null {
  const exact = snippets.find(
    (snippet) =>
      snippet.filePath === parsed.filePath &&
      snippet.startLine === parsed.startLine &&
      snippet.endLine === parsed.endLine,
  );
  if (exact) return exact;

  const overlapping = snippets.find(
    (snippet) =>
      snippet.filePath === parsed.filePath &&
      isLineRangeOverlapping(snippet.startLine, snippet.endLine, parsed.startLine, parsed.endLine),
  );
  if (overlapping) return overlapping;

  return null;
}

function isSuggestionGrounded(
  suggestion: ParsedSuggestion,
  citations: Citation[],
): boolean {
  const signalTerms = tokenize(
    `${suggestion.title} ${suggestion.rationale} ${suggestion.expectedImpact}`,
    SUGGESTION_STOPWORDS,
  );
  if (signalTerms.length === 0) return false;

  const citationText = citations
    .map((citation) => `${citation.filePath}\n${citation.snippet}`.toLowerCase())
    .join("\n");

  return signalTerms.some((term) => citationText.includes(term));
}

function rankCitationForQuestion(citation: Citation, terms: string[], questionLower: string): number {
  const path = citation.filePath.toLowerCase();
  const content = citation.snippet.toLowerCase();
  const asksStyling = /\b(style|styling|theme|dark mode|dark|css|ui|color|colors|class)\b/i.test(questionLower);

  let score = 0;
  for (const term of terms) {
    if (path.includes(term)) score += 3;
    if (content.includes(term)) score += 1;
  }

  if (asksStyling) {
    if (path.endsWith(".css") || path.endsWith(".scss") || path.endsWith(".sass") || path.endsWith(".less")) {
      score += 5;
    }
    if (path.endsWith(".html") || path.endsWith(".tsx") || path.endsWith(".jsx")) {
      score += 2;
    }
    if (content.includes(":root") || content.includes("background") || content.includes("color:")) {
      score += 2;
    }
  }

  return score;
}

function selectRelevantCitations(citations: Citation[], question?: string): Citation[] {
  if (citations.length === 0) return [];

  const normalizedQuestion = (question || "").trim();
  if (!normalizedQuestion) return citations.slice(0, 3);

  const terms = tokenize(normalizedQuestion, QUESTION_STOPWORDS);
  const questionLower = normalizedQuestion.toLowerCase();
  const ranked = citations
    .map((citation, index) => ({
      citation,
      score: rankCitationForQuestion(citation, terms, questionLower),
      index,
    }))
    .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score));

  const hasPositive = ranked.some((item) => item.score > 0);
  const selected = (hasPositive ? ranked.filter((item) => item.score > 0) : ranked)
    .slice(0, 3)
    .map((item) => item.citation);

  return selected.length > 0 ? selected : citations.slice(0, 3);
}

export function buildRefactorPrompt(question: string, chunks: Chunk[]): string {
  const evidence = chunks
    .map(
      (chunk, index) =>
        `[Evidence ${index + 1}: ${chunk.file_path} (lines ${chunk.start_line}-${chunk.end_line})]\n${chunk.content}`,
    )
    .join("\n\n");

  return `You are a senior code reviewer.
Analyze ONLY the provided evidence and propose practical refactor suggestions.
Do not mention files or lines outside this evidence.

Return STRICT JSON with this shape:
{
  "suggestions": [
    {
      "title": "short title",
      "rationale": "why this refactor is useful based on evidence",
      "expectedImpact": "expected effect",
      "citations": [
        {
          "filePath": "path/to/file",
          "startLine": 1,
          "endLine": 10
        }
      ]
    }
  ]
}

Rules:
- 1 to 5 suggestions.
- Every suggestion must include at least one citation from evidence.
- Do not suggest frameworks, libraries, or files that are not in evidence.
- If evidence is weak, return fewer suggestions rather than generic advice.
- Keep text concise and technical.
- Output JSON only, no markdown.

QUESTION:
${question}

EVIDENCE:
${evidence}`;
}

export function parseRefactorSuggestions(raw: string, snippets: Citation[]): RefactorSuggestion[] {
  const parsed = extractJsonCandidate(raw);
  const normalized = normalizeParsedSuggestions(parsed);

  return normalized
    .map((suggestion) => {
      const resolvedCitations = suggestion.citations
        .map((citation) => resolveCitation(citation, snippets))
        .filter((citation): citation is Citation => Boolean(citation));

      const deduped = resolvedCitations.filter(
        (citation, index, list) =>
          index ===
          list.findIndex(
            (item) =>
              citationKey(item.filePath, item.startLine, item.endLine) ===
              citationKey(citation.filePath, citation.startLine, citation.endLine),
          ),
      );

      if (deduped.length === 0) return null;
      if (!isSuggestionGrounded(suggestion, deduped)) return null;

      return {
        title: suggestion.title,
        rationale: suggestion.rationale,
        expectedImpact: suggestion.expectedImpact,
        citations: deduped,
      };
    })
    .filter((suggestion): suggestion is RefactorSuggestion => Boolean(suggestion))
    .slice(0, 5);
}

export function buildFallbackRefactorSuggestions(snippets: Citation[], question?: string): RefactorSuggestion[] {
  if (snippets.length === 0) return [];
  const selectedCitations = selectRelevantCitations(snippets, question);

  const templates = [
    {
      title: "Extract focused helper functions",
      rationale:
        "The retrieved block appears multi-purpose. Splitting responsibilities reduces cognitive load and makes tests simpler.",
      expectedImpact: "Improves readability and unit-test coverage.",
    },
    {
      title: "Centralize validation and error handling",
      rationale:
        "Validation and failure paths are easier to maintain when handled at clear boundaries instead of being scattered.",
      expectedImpact: "More consistent runtime behavior and clearer failure messages.",
    },
    {
      title: "Isolate configuration and constants",
      rationale:
        "Hard-coded values and policy decisions are easier to evolve when moved to well-named constants or config modules.",
      expectedImpact: "Reduces accidental regressions during future changes.",
    },
  ];

  return templates.slice(0, selectedCitations.length).map((template, index) => ({
    ...template,
    citations: [selectedCitations[index]],
  }));
}
