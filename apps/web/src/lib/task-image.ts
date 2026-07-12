/** Matches the first markdown image link in a task description, e.g. ![alt](https://...). */
const IMAGE_MARKDOWN_RE = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/;

export function extractImageUrl(description: string | null): string | null {
  if (!description) return null;
  return description.match(IMAGE_MARKDOWN_RE)?.[1] ?? null;
}
