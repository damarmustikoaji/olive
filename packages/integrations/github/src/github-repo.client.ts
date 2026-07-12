import { TransientHttpError, withRetry } from "@ai-workforce/shared";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".sql", ".md", ".json"];
const EXCLUDED_PATH_SEGMENTS = ["node_modules/", "dist/", ".next/", "package-lock.json", "pnpm-lock.yaml"];

/**
 * Read-only source access for Code Investigator — never writes, never
 * commits, never opens a branch/PR. Just enough to let an agent look at a
 * repo's structure and a handful of file contents to reason about a bug.
 */
export class GithubRepoClient {
  constructor(private readonly token: string, private readonly baseUrl = "https://api.github.com") {}

  /** Recursive file listing, filtered to source-like files, capped to keep prompts small. */
  async listSourceFiles(owner: string, repo: string, maxFiles = 300): Promise<string[]> {
    return withRetry(async () => {
      const repoInfo = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!repoInfo.ok) throw new Error(`GitHub repo lookup failed (${repoInfo.status})`);
      const { default_branch: branch } = (await repoInfo.json()) as { default_branch: string };

      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: { Authorization: `Bearer ${this.token}` } },
      );
      if (response.status >= 500) throw new TransientHttpError(`github:${owner}/${repo}/tree`);
      if (!response.ok) throw new Error(`GitHub tree lookup failed (${response.status}): ${await response.text()}`);

      const data = (await response.json()) as { tree: { path: string; type: string }[] };
      const paths = data.tree
        .filter((entry) => entry.type === "blob")
        .map((entry) => entry.path)
        .filter((path) => SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext)))
        .filter((path) => !EXCLUDED_PATH_SEGMENTS.some((segment) => path.includes(segment)));

      return paths.slice(0, maxFiles);
    });
  }

  /** Decoded file content, or null if the path doesn't exist / isn't a file. */
  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    return withRetry(async () => {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURI(path)}`,
        { headers: { Authorization: `Bearer ${this.token}`, Accept: "application/vnd.github+json" } },
      );

      if (response.status === 404) return null;
      if (response.status >= 500) throw new TransientHttpError(`github:${owner}/${repo}/contents`);
      if (!response.ok) throw new Error(`GitHub file lookup failed (${response.status}): ${await response.text()}`);

      const data = (await response.json()) as { content?: string; encoding?: string };
      if (!data.content || data.encoding !== "base64") return null;

      return Buffer.from(data.content, "base64").toString("utf-8");
    });
  }
}
