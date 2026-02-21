/* utsav */
export interface Source {
  id: string;
  type: 'zip' | 'github';
  name: string;
  github_url?: string;
  created_at: string;
}

export interface Chunk {
  id: string;
  source_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  content: string;
  source_url?: string;
  similarity?: number;
}

export interface Citation {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet: string;
  sourceUrl?: string;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  retrievedSnippets: Citation[];
  confidence?: number;
  note_when_insufficient_evidence?: string;
}

export interface IngestResult {
  sourceId: string;
  fileCount: number;
  chunkCount: number;
}

export interface StatusResult {
  backend: 'healthy' | 'unhealthy';
  db: 'healthy' | 'unhealthy';
  llm: 'healthy' | 'unhealthy';
}

export interface QAHistory {
  id: string;
  source_id: string;
  question: string;
  answer: string;
  citations_json: Citation[];
  created_at: string;
}
