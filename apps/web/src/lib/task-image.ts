/** Matches every markdown image link in a task description, e.g. ![alt](https://...). */
const IMAGE_MARKDOWN_RE = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;

export function extractImageUrls(description: string | null): string[] {
  if (!description) return [];
  return [...description.matchAll(IMAGE_MARKDOWN_RE)]
    .map((m) => m[1])
    .filter((url): url is string => url !== undefined);
}
