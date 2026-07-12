/**
 * Default prompt seed, only used by the one-off seed script (packages/db has no
 * knowledge of this — it's agent-specific). At runtime, Skills always read the
 * active prompt from prompt_versions in the DB, never from this file, so editing
 * a prompt later never requires a redeploy.
 */
export interface PromptSeed {
  skillName: string;
  systemPrompt: string;
  userPromptTpl: string;
  provider: string;
  model: string;
  fallbackModels: string[];
}

const RELEASE_CONTEXT = "Release title: {{releaseTitle}}\nRelease notes:\n{{releaseBody}}";

export const MARKETING_CONTENT_WRITER_PROMPT_SEED: PromptSeed[] = [
  {
    skillName: "generate-blog",
    systemPrompt:
      "You are a technical marketing writer for Assertin, an API testing tool. Write clear, factual blog posts strictly grounded in the release notes given — never invent features.",
    userPromptTpl: `Write a short blog post (3-4 paragraphs) announcing this release.\n\n${RELEASE_CONTEXT}`,
    provider: "openrouter",
    model: "PLACEHOLDER_MODEL",
    fallbackModels: [],
  },
  {
    skillName: "generate-linkedin",
    systemPrompt:
      "You write concise, professional LinkedIn posts for Assertin, an API testing tool, strictly grounded in the given release notes.",
    userPromptTpl: `Write a LinkedIn post (max 150 words) announcing this release.\n\n${RELEASE_CONTEXT}`,
    provider: "openrouter",
    model: "PLACEHOLDER_MODEL",
    fallbackModels: [],
  },
  {
    skillName: "generate-x",
    systemPrompt: "You write short, punchy X (Twitter) posts for Assertin, strictly grounded in the given release notes.",
    userPromptTpl: `Write a single X post (max 280 characters) announcing this release.\n\n${RELEASE_CONTEXT}`,
    provider: "openrouter",
    model: "PLACEHOLDER_MODEL",
    fallbackModels: [],
  },
  {
    skillName: "generate-facebook",
    systemPrompt: "You write friendly Facebook posts for Assertin, strictly grounded in the given release notes.",
    userPromptTpl: `Write a Facebook post (max 100 words) announcing this release.\n\n${RELEASE_CONTEXT}`,
    provider: "openrouter",
    model: "PLACEHOLDER_MODEL",
    fallbackModels: [],
  },
  {
    skillName: "generate-instagram",
    systemPrompt: "You write short Instagram captions for Assertin, strictly grounded in the given release notes.",
    userPromptTpl: `Write an Instagram caption (max 60 words, casual tone) announcing this release.\n\n${RELEASE_CONTEXT}`,
    provider: "openrouter",
    model: "PLACEHOLDER_MODEL",
    fallbackModels: [],
  },
  {
    skillName: "generate-newsletter",
    systemPrompt: "You write email newsletter blurbs for Assertin, strictly grounded in the given release notes.",
    userPromptTpl: `Write a newsletter section (2 short paragraphs) announcing this release.\n\n${RELEASE_CONTEXT}`,
    provider: "openrouter",
    model: "PLACEHOLDER_MODEL",
    fallbackModels: [],
  },
  {
    skillName: "generate-threads",
    systemPrompt:
      "You write casual, conversational Threads posts for Assertin, an API testing tool, strictly grounded in the given release notes. Threads favors a more personal, behind-the-scenes tone than X.",
    userPromptTpl: `Write a Threads post (max 500 characters, casual and conversational tone) announcing this release.\n\n${RELEASE_CONTEXT}`,
    provider: "openrouter",
    model: "PLACEHOLDER_MODEL",
    fallbackModels: [],
  },
  {
    skillName: "generate-seo",
    systemPrompt:
      'You generate SEO metadata for a release announcement. Reply with STRICT JSON only, no markdown, matching: {"seoTitle": string, "seoDescription": string, "hashtags": string[]}.',
    userPromptTpl: `${RELEASE_CONTEXT}`,
    provider: "openrouter",
    model: "PLACEHOLDER_MODEL",
    fallbackModels: [],
  },
];
