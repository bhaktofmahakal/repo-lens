/* utsav */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Github, Loader2 } from "lucide-react";

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
    if (!githubUrl) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ingest/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl }),
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
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Repo Lens</h1>
        <p className="text-xl opacity-80">Ask questions about your codebase with verifiable evidence.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        {/* ZIP Upload */}
        <section className="p-8 border rounded-xl shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Upload className="w-6 h-6" />
            <h2 className="text-2xl font-semibold">Upload ZIP</h2>
          </div>
          <form onSubmit={handleZipUpload}>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
              className="w-full p-2 mb-4 border rounded"
            />
            <button
              type="submit"
              disabled={loading || !zipFile}
              className="w-full py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" />}
              Ingest ZIP
            </button>
          </form>
        </section>

        {/* GitHub Ingest */}
        <section className="p-8 border rounded-xl shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Github className="w-6 h-6" />
            <h2 className="text-2xl font-semibold">GitHub Repo</h2>
          </div>
          <form onSubmit={handleGithubIngest}>
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full p-2 mb-4 border rounded"
            />
            <button
              type="submit"
              disabled={loading || !githubUrl}
              className="w-full py-2 bg-slate-800 text-white rounded font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" />}
              Ingest Repo
            </button>
          </form>
        </section>
      </div>

      {error && (
        <div className="mt-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <footer className="mt-20 text-center text-sm opacity-60 flex flex-col gap-4">
        <div className="flex justify-center gap-8">
            <a href="/status" className="underline hover:opacity-80">System Status</a>
        </div>
        <p>Repo Lens - Build and ship codebase Q&A.</p>
      </footer>
    </div>
  );
}
