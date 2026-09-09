"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, ExternalLink, FileCode, Hash, Layers } from "lucide-react";

type Chunk = {
  start_line: number;
  end_line: number;
  content: string;
};

type SourceViewerClientProps = {
  sourceId: string;
  sourceName?: string;
  filePath: string;
  chunks: Chunk[];
};

export function SourceViewerClient({
  sourceId,
  sourceName,
  filePath,
  chunks,
}: SourceViewerClientProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(filePath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopyChunk = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const totalLines = chunks.reduce((acc, c) => acc + (c.end_line - c.start_line + 1), 0);

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white">
      {/* Top Breadcrumb & Actions Bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#121216]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/ask?sourceId=${encodeURIComponent(sourceId)}`}
              className="btn-cohere-outline !px-3 !py-1.5 text-xs"
              title="Return to Ask session"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Ask</span>
            </Link>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-[#ff7759]" />
              <span className="font-mono text-xs text-white/90 truncate max-w-[280px] sm:max-w-[450px]">
                {filePath}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPath}
              className="btn-cohere-outline !py-1.5 text-xs"
            >
              {copiedPath ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Path</span>
                </>
              )}
            </button>
            <Link
              href="/dashboard"
              className="btn-cohere-outline !py-1.5 text-xs hidden sm:inline-flex"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* File Overview Banner in Cohere Agent Console style */}
        <div className="mb-6 rounded-xl border border-white/10 bg-[#17171c] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="cohere-mono-label">INDEXED EVIDENCE VIEWER</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[11px] text-emerald-400 uppercase tracking-wider">
                  Verified Chunked
                </span>
              </div>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-white font-mono break-all">
                {filePath}
              </h1>
              {sourceName && (
                <p className="mt-1 text-xs text-white/50">
                  Repository source: <span className="text-white/80 font-medium">{sourceName}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-right">
                <div className="cohere-mono-label text-[10px]">CHUNKS</div>
                <div className="font-mono text-sm font-semibold text-white">{chunks.length}</div>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-right">
                <div className="cohere-mono-label text-[10px]">TOTAL LINES</div>
                <div className="font-mono text-sm font-semibold text-white">{totalLines}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chunks List */}
        <div className="space-y-4">
          {chunks.map((chunk, index) => (
            <article
              key={`${chunk.start_line}-${chunk.end_line}-${index}`}
              id={`L${chunk.start_line}-L${chunk.end_line}`}
              className="group overflow-hidden rounded-xl border border-white/10 bg-[#141418] transition-all hover:border-white/20"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#1a1a20] px-4 py-2.5">
                <div className="flex items-center gap-2.5 font-mono text-xs text-white/70">
                  <Hash className="h-3.5 w-3.5 text-[#ff7759]" />
                  <span className="font-semibold text-white">Lines {chunk.start_line} – {chunk.end_line}</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/50 text-[11px]">{chunk.end_line - chunk.start_line + 1} lines</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyChunk(chunk.content, index)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-white/90 bg-[#0d0d10]">
                <pre className="selection:bg-[#ff7759]/30">
                  <code>{chunk.content}</code>
                </pre>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
