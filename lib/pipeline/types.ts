export type ImageRef = {
  id: string;
  url: string;
  /** Existing description found in Contentful (if any). */
  existingDescription: string | null;
};

export type DescribedImage = ImageRef & {
  description: string;
  /** OpenAI reported total tokens for this image-generation request. */
  tokensUsed: number | null;
  status: "generated" | "skipped";
};
