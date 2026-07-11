import crypto from "node:crypto";
import OAuth from "oauth-1.0a";
import { TransientHttpError } from "@ai-workforce/shared";

export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface PostTweetResult {
  id: string;
  url: string;
}

const POST_TWEETS_URL = "https://api.x.com/2/tweets";

/**
 * Posts as a single, fixed account (@assertincom) using OAuth 1.0a user-context
 * signing — no interactive OAuth flow needed since the posting account never
 * changes. All four credentials come from one X Developer App.
 */
export class XTwitterClient {
  private readonly oauth: OAuth;
  private readonly token: { key: string; secret: string };

  constructor(credentials: XCredentials) {
    this.oauth = new OAuth({
      consumer: { key: credentials.apiKey, secret: credentials.apiSecret },
      signature_method: "HMAC-SHA1",
      hash_function: (baseString, key) =>
        crypto.createHmac("sha1", key).update(baseString).digest("base64"),
    });
    this.token = { key: credentials.accessToken, secret: credentials.accessTokenSecret };
  }

  async postTweet(text: string): Promise<PostTweetResult> {
    const request = { url: POST_TWEETS_URL, method: "POST" };
    const authHeader = this.oauth.toHeader(this.oauth.authorize(request, this.token));

    const response = await fetch(POST_TWEETS_URL, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (response.status >= 500) throw new TransientHttpError("x-twitter");
    if (!response.ok) {
      throw new Error(`X API post failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as { data: { id: string } };
    return {
      id: data.data.id,
      // Hardcoded handle: this client only ever posts as @assertincom.
      // If that changes, this needs to become a constructor param.
      url: `https://x.com/assertincom/status/${data.data.id}`,
    };
  }
}
