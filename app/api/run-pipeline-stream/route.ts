import { runStreamingPipeline, type StreamEvent } from "@/lib/pipeline/run-streaming-pipeline";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        await runStreamingPipeline(
          {
            limit: typeof body?.limit === "number" && body.limit > 0 ? body.limit : undefined,
            locale: typeof body?.locale === "string" ? body.locale : undefined,
            publish: typeof body?.publish === "boolean" ? body.publish : undefined,
          },
          send,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[api/run-pipeline-stream]", message);
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
