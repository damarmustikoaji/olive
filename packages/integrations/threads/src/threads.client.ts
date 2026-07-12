import { TransientHttpError, withRetry } from "@ai-workforce/shared";

export interface ThreadsCredentials {
  userId: string;
  accessToken: string;
}

export interface PostThreadResult {
  id: string;
  url: string;
}

const BASE_URL = "https://graph.threads.net/v1.0";

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
    const creationId = await this.createContainer(text);
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
      if (response.status >= 500) throw new TransientHttpError("threads:create-container");
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
      if (response.status >= 500) throw new TransientHttpError("threads:publish");
      if (!response.ok) {
        throw new Error(`Threads publish failed (${response.status}): ${await response.text()}`);
      }

      const data = (await response.json()) as { id: string };
      return data.id;
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
