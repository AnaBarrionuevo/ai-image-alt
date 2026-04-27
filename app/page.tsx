"use client";

import { useState } from "react";

type PipelineRow = {
  id: string;
  url: string;
  description: string;
  tokensUsed: number | null;
  status: "generated" | "skipped";
};

type StreamEvent =
  | { type: "start"; total: number }
  | { type: "asset"; data: PipelineRow }
  | { type: "done"; total: number; generated: number; skipped: number }
  | { type: "error"; message: string };

export default function Home() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  const runPipeline = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setStatusMessage("Starting...");
    setRows([]);
    setProgress(0);
    setTotal(0);

    let knownTotal = 0;
    let received = 0;

    try {
      const res = await fetch("/api/run-pipeline-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = JSON.parse(line) as StreamEvent;

          if (event.type === "start") {
            knownTotal = event.total;
            setTotal(event.total);
            setProgress(knownTotal === 0 ? 100 : 2);
            setStatusMessage(`Processing ${event.total} asset(s)…`);
          } else if (event.type === "asset") {
            received++;
            setRows((prev) => [...prev, event.data]);
            const pct = knownTotal > 0 ? Math.round((received / knownTotal) * 95) : 0;
            setProgress(pct);
          } else if (event.type === "done") {
            setProgress(100);
            setStatusMessage(
              `Done — ${event.total} asset(s): ${event.generated} generated, ${event.skipped} skipped.`,
            );
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (error) {
      setProgress(0);
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatusMessage(`Failed: ${message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const totalTokens = rows.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0);
  const hasMissingTokens = rows.some((r) => r.tokensUsed === null && r.status === "generated");

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

        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            {isRunning && total > 0
              ? `${rows.length} / ${total} assets`
              : "\u00a0"}
          </span>
          <span>{progress > 0 ? `${progress}%` : "\u00a0"}</span>
        </div>

        <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
            aria-label="Pipeline progress"
          />
        </div>

        {rows.length > 0 && (
          <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Total tokens used:{" "}
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {totalTokens.toLocaleString()}
            </span>
            {hasMissingTokens && (
              <span className="ml-1 text-zinc-400">(some counts unavailable)</span>
            )}
          </div>
        )}

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
