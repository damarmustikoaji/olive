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
  /** Null when the batch's source isn't a GitHub release (e.g. a Research Agent idea). */
  repositoryId: string | null;
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
  | "threads"
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
  publishedMediaId: string | null;
  createdAt: Date;
}

/**
 * One daily metrics snapshot for a published piece (not overwritten), so
 * growth over time is visible rather than only the latest total.
 */
export interface ContentInsight {
  id: string;
  contentPieceId: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  fetchedAt: Date;
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

// ============================================================
// TASK — the central business entity (Jira-like). Not to be confused with
// TaskRun above, which is purely infra bookkeeping (one row per workflow
// execution, for idempotency/retry). A Task is work a human or agent cares
// about; a TaskRun is "did this GitHub Actions shift already do X".
// ============================================================

export type TaskStatus =
  | "backlog"
  | "assigned"
  | "in_progress"
  | "ready_for_review"
  | "approved"
  | "done"
  | "rejected"
  | "failed";

export type TaskSeverity = "minor" | "medium" | "critical";
export type TaskPriority = "low" | "medium" | "high";
export type TaskSource = "github_release" | "github_issue" | "manual" | "support_ticket" | "research" | "insight";
export type TaskCreatedBy = "system" | "owner";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  source: TaskSource;
  sourceRef: string | null;
  severity: TaskSeverity;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeAgent: string | null;
  contentBatchId: string | null;
  payload: Record<string, unknown>;
  createdBy: TaskCreatedBy;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  event: string;
  meta: Record<string, unknown> | null;
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

export type AgentStatus = "active" | "not_hired";

export interface AgentProfile {
  agentName: string;
  role: string;
  level: string;
  status: AgentStatus;
  description: string;
  updatedAt: Date;
}

/**
 * Read-only view of a row from public.support_tickets — a table owned by
 * a different app (Sandbox), not by AI Workforce. We never write back to
 * it; anything AI Workforce produces from a ticket lives in workforce.tasks
 * / workforce.task_events instead.
 */
export interface SupportTicket {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
}

export interface AgentUsageSummary {
  invocationCount: number;
  inputTokens: number;
  outputTokens: number;
}
