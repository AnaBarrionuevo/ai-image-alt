"use client";

import { useEffect, useRef, useState } from "react";

type PipelineRow = {
  id: string;
  url: string;
  description: string;
  tokensUsed: number | null;
  status: "generated" | "skipped";
};

type RunPipelineResponse = {
  ok: boolean;
  error?: string;
  count?: number;
  results?: PipelineRow[];
};

export default function Home() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Idle");
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startVisualProgress = () => {
    setProgress(8);
    timerRef.current = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.max(1, (95 - prev) * 0.12), 95));
    }, 500);
  };

  const stopVisualProgress = (nextProgress: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(nextProgress);
  };

  const runPipeline = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setStatusMessage("Running pipeline: read -> generate -> push...");
    setRows([]);
    startVisualProgress();

    try {
      const res = await fetch("/api/run-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await res.json()) as RunPipelineResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Pipeline request failed");
      }

      const nextRows = Array.isArray(data.results) ? data.results : [];
      setRows(nextRows);
      stopVisualProgress(100);
      setStatusMessage(`Done. Processed ${nextRows.length} asset(s).`);
    } catch (error) {
      stopVisualProgress(0);
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatusMessage(`Failed: ${message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">AI Image Alt Pipeline</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Trigger Contentful read, OpenAI description generation, and CMA push in one run.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runPipeline}
            disabled={isRunning}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isRunning ? "Running..." : "Run pipeline"}
          </button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{statusMessage}</span>
        </div>

        <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
            aria-label="Pipeline progress"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-4 font-semibold">ID</th>
                <th className="py-2 pr-4 font-semibold">URL</th>
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 pl-4 font-semibold">Tokens</th>
                <th className="py-2 pl-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-4 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No results yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 align-top dark:border-zinc-900"
                  >
                    <td className="py-3 pr-4 font-mono text-xs">{row.id}</td>
                    <td className="py-3 pr-4">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="line-clamp-2 break-all text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {row.url}
                      </a>
                    </td>
                    <td className="py-3">{row.description}</td>
                    <td className="py-3 pl-4 font-mono text-xs">
                      {row.tokensUsed ?? "-"}
                    </td>
                    <td className="py-3 pl-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          row.status === "generated"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
