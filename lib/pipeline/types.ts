export type ImageRef = {
  id: string;
  url: string;
};

export type DescribedImage = ImageRef & {
  description: string;
};
