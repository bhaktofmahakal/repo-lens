"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Github, Loader2, Upload } from "lucide-react";

export default function Home() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleZipUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipFile) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", zipFile);

    try {
      const response = await fetch("/api/ingest/zip", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to upload ZIP");
      router.push(`/ask?sourceId=${data.sourceId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ingest/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to ingest GitHub repo");
      router.push(`/ask?sourceId=${data.sourceId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:py-14">
      <header className="mb-8 rounded-3xl border border-slate-700/80 bg-slate-900/70 p-8 shadow-[0_30px_90px_-45px_rgba(56,189,248,0.65)] backdrop-blur">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Repository Question Answering</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Repo Lens</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Upload a ZIP or ingest a public GitHub repository, then ask questions and verify every answer with exact file + line evidence.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-700/80 bg-slate-900/65 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">How it works</h2>
        <ol className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <li className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
            Select input source: ZIP upload or public GitHub URL.
          </li>
          <li className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
            Repo Lens indexes text/code files and ignores unsupported binaries.
          </li>
          <li className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">3</span>
            Ask in natural language and inspect citations + retrieved snippets.
          </li>
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-700/80 bg-slate-900/65 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/15 p-2 text-blue-300">
              <Upload className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Upload ZIP</h2>
          </div>
          <form onSubmit={handleZipUpload} className="space-y-4">
            <label htmlFor="zip-input" className="block text-sm font-medium text-slate-300">
              ZIP file
            </label>
            <input
              id="zip-input"
              type="file"
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-3 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !zipFile}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900/45 disabled:text-slate-300"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Ingest ZIP
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-700/80 bg-slate-900/65 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 p-2 text-cyan-300">
              <Github className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">GitHub Repo</h2>
          </div>
          <form onSubmit={handleGithubIngest} className="space-y-4">
            <label htmlFor="github-url" className="block text-sm font-medium text-slate-300">
              Public repository URL
            </label>
            <input
              id="github-url"
              type="url"
              placeholder="https://github.com/owner/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-600 bg-slate-950/70 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
            />
            <button
              type="submit"
              disabled={loading || !githubUrl.trim()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-cyan-950/45 disabled:text-slate-300"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Ingest Repo
            </button>
          </form>
        </section>
      </div>

      {error ? <div className="mt-6 rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-200">{error}</div> : null}

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/60 px-5 py-4 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Citation-backed answers only
        </div>
        <a href="/status" className="font-medium text-blue-300 underline decoration-blue-300/30 underline-offset-4 hover:text-blue-200">
          Check System Status
        </a>
      </footer>
    </div>
  );
}
