import { TransientHttpError, withRetry } from "@ai-workforce/shared";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

const BASE_URL = "https://api.tavily.com/search";

/** Free "Researcher" tier: 1,000 credits/month, no credit card required. */
export class TavilyClient {
  constructor(private readonly apiKey: string) {}

  async search(query: string, maxResults = 5): Promise<TavilySearchResult[]> {
    return withRetry(async () => {
      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          max_results: maxResults,
          search_depth: "basic",
        }),
      });

      if (response.status >= 500) throw new TransientHttpError("tavily:search");
      if (!response.ok) {
        throw new Error(`Tavily search failed (${response.status}): ${await response.text()}`);
      }

      const data = (await response.json()) as { results: TavilySearchResult[] };
      return data.results;
    });
  }
}
