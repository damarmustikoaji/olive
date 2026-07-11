export interface WatchedRepository {
  id: string;
  owner: string;
  repo: string;
  isActive: boolean;
  lastReleaseTag: string | null;
  lastCheckedAt: Date | null;
}

export type TaskRunStatus = "pending" | "running" | "done" | "failed";

export interface TaskRun {
  id: string;
  workflowName: string;
  agentName: string | null;
  triggerRef: string;
  status: TaskRunStatus;
  attemptCount: number;
  errorMessage: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

export type ContentBatchStatus = "draft" | "ready" | "published" | "rejected";

export interface ContentBatch {
  id: string;
  taskRunId: string;
  repositoryId: string;
  releaseTag: string;
  releaseTitle: string | null;
  releaseBody: string | null;
  status: ContentBatchStatus;
  createdAt: Date;
}

export type ContentPlatform =
  | "blog"
  | "linkedin"
  | "x"
  | "facebook"
  | "instagram"
  | "newsletter"
  | "seo";

export interface ContentPiece {
  id: string;
  contentBatchId: string;
  platform: ContentPlatform;
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  hashtags: string[];
  reviewedBy: string | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  publishedUrl: string | null;
  createdAt: Date;
}

export interface PromptVersion {
  id: string;
  promptTemplateId: string;
  version: number;
  systemPrompt: string;
  userPromptTpl: string;
  provider: string;
  model: string;
  fallbackModels: string[];
  createdAt: Date;
}

export interface AiInvocationRecord {
  taskRunId: string;
  provider: string;
  model: string;
  promptVersionId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: "success" | "failed" | "retried";
  errorMessage?: string;
}
