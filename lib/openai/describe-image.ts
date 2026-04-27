import { getOpenAI } from "@/lib/openai/client";

const DEFAULT_PROMPT =
  "Write a concise, accurate alt text description for this image for accessibility and SEO. " +
  "Maximum two short sentences. Do not start with 'Image of' or 'Picture of' unless necessary.";

/**
 * Generates a short alt-style description for an image reachable at the given URL
 * (e.g. Contentful asset URL). Uses a vision-capable chat model.
 */
export async function describeImageFromUrl(
  imageUrl: string,
  options?: { prompt?: string },
): Promise<{ description: string; tokensUsed: number | null }> {
  const openai = getOpenAI();
  const prompt = options?.prompt ?? DEFAULT_PROMPT;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 400,
  });

  const description = response.choices[0]?.message?.content?.trim();
  if (!description) {
    throw new Error("OpenAI returned an empty description");
  }
  const tokensUsed =
    typeof response.usage?.total_tokens === "number"
      ? response.usage.total_tokens
      : null;

  return { description, tokensUsed };
}
