import { TransientHttpError, withRetry } from "@ai-workforce/shared";

export interface GithubRelease {
  tag: string;
  title: string;
  body: string;
}

export class GithubReleaseClient {
  constructor(private readonly token: string, private readonly baseUrl = "https://api.github.com") {}

  async getLatestRelease(owner: string, repo: string): Promise<GithubRelease | null> {
    return withRetry(async () => {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/releases/latest`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (response.status === 404) return null; // repo has no releases yet — not an error
      if (response.status >= 500) throw new TransientHttpError(`github:${owner}/${repo}`);
      if (!response.ok) {
        throw new Error(`GitHub release lookup failed (${response.status}): ${await response.text()}`);
      }

      const data = (await response.json()) as { tag_name: string; name: string; body: string };
      return { tag: data.tag_name, title: data.name ?? data.tag_name, body: data.body ?? "" };
    });
  }

  async repoExists(owner: string, repo: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    return response.ok;
  }
}
