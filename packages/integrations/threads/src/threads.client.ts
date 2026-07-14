import { TransientHttpError, withRetry } from "@ai-workforce/shared";

export interface ThreadsCredentials {
  userId: string;
  accessToken: string;
}

export interface PostThreadResult {
  id: string;
  url: string;
}

export interface MediaInsights {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

const BASE_URL = "https://graph.threads.net/v1.0";
const MAX_TEXT_LENGTH = 500;

/**
 * The prompt tells the model to stay under 500 chars, but free-tier models
 * don't reliably obey character-count instructions — this was silently
 * failing every publish (and every retry) for any piece that overshot,
 * with Meta returning a generic-looking 500 that hid the real "too long"
 * validation error. This is the actual enforcement; the prompt limit is
 * just a hint to reduce how often it's needed.
 */
function truncateForThreads(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  const cut = text.slice(0, MAX_TEXT_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

/**
 * Posts as a single, fixed account (@assertin.forge) using a long-lived
 * user access token generated once from the Meta Developer dashboard (no
 * interactive OAuth flow — the token comes straight from being added as a
 * Threads Tester on the app). Posting is Meta's documented two-step flow:
 * create a container, then publish it.
 */
export class ThreadsClient {
  constructor(private readonly credentials: ThreadsCredentials) {}

  async postThread(text: string): Promise<PostThreadResult> {
    const creationId = await this.createContainer(truncateForThreads(text));
    const mediaId = await this.publishContainer(creationId);
    const url = await this.getPermalink(mediaId);
    return { id: mediaId, url };
  }

  private async createContainer(text: string): Promise<string> {
    return withRetry(async () => {
      const url = new URL(`${BASE_URL}/${this.credentials.userId}/threads`);
      url.searchParams.set("media_type", "TEXT");
      url.searchParams.set("text", text);
      url.searchParams.set("access_token", this.credentials.accessToken);

      const response = await fetch(url, { method: "POST" });
      if (response.status >= 500) {
        throw new TransientHttpError(`threads:create-container (${response.status}): ${await response.text()}`);
      }
      if (!response.ok) {
        throw new Error(`Threads create container failed (${response.status}): ${await response.text()}`);
      }

      const data = (await response.json()) as { id: string };
      return data.id;
    });
  }

  private async publishContainer(creationId: string): Promise<string> {
    return withRetry(async () => {
      const url = new URL(`${BASE_URL}/${this.credentials.userId}/threads_publish`);
      url.searchParams.set("creation_id", creationId);
      url.searchParams.set("access_token", this.credentials.accessToken);

      const response = await fetch(url, { method: "POST" });
      if (response.status >= 500) {
        throw new TransientHttpError(`threads:publish (${response.status}): ${await response.text()}`);
      }
      if (!response.ok) {
        throw new Error(`Threads publish failed (${response.status}): ${await response.text()}`);
      }

      const data = (await response.json()) as { id: string };
      return data.id;
    });
  }

  /** Per-post metrics — not available until a few minutes after publish. */
  async getMediaInsights(mediaId: string): Promise<MediaInsights> {
    return withRetry(async () => {
      const url = new URL(`${BASE_URL}/${mediaId}/insights`);
      url.searchParams.set("metrics", "views,likes,replies,reposts,quotes");
      url.searchParams.set("access_token", this.credentials.accessToken);

      const response = await fetch(url);
      if (response.status >= 500) throw new TransientHttpError("threads:insights");
      if (!response.ok) {
        throw new Error(`Threads insights failed (${response.status}): ${await response.text()}`);
      }

      const data = (await response.json()) as { data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] };
      const metric = (name: string) => {
        const entry = data.data.find((d) => d.name === name);
        return entry?.total_value?.value ?? entry?.values?.[0]?.value ?? 0;
      };

      return {
        views: metric("views"),
        likes: metric("likes"),
        replies: metric("replies"),
        reposts: metric("reposts"),
        quotes: metric("quotes"),
      };
    });
  }

  private async getPermalink(mediaId: string): Promise<string> {
    const url = new URL(`${BASE_URL}/${mediaId}`);
    url.searchParams.set("fields", "permalink");
    url.searchParams.set("access_token", this.credentials.accessToken);

    const response = await fetch(url);
    if (!response.ok) {
      // Publish already succeeded — a missing permalink shouldn't be treated as failure.
      return `https://www.threads.net/@assertin.forge`;
    }
    const data = (await response.json()) as { permalink?: string };
    return data.permalink ?? `https://www.threads.net/@assertin.forge`;
  }
}
