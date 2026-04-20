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
): Promise<string> {
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

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI returned an empty description");
  }
  return text;
}
