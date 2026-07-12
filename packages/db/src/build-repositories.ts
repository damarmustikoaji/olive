import { createSupabaseClient } from "./supabase-client.js";
import type { RepositoryBundle } from "@ai-workforce/core";
import { WatchedRepositoryRepo } from "./repositories/watched-repository.repo.js";
import { TaskRunRepo } from "./repositories/task-run.repo.js";
import { WorkTaskRepo } from "./repositories/work-task.repo.js";
import { TaskEventRepo } from "./repositories/task-event.repo.js";
import { ContentBatchRepo } from "./repositories/content-batch.repo.js";
import { ContentPieceRepo } from "./repositories/content-piece.repo.js";
import { ContentInsightRepo } from "./repositories/content-insight.repo.js";
import { PromptVersionRepo } from "./repositories/prompt-version.repo.js";
import { AiInvocationRepo } from "./repositories/ai-invocation.repo.js";
import { AgentProfileRepo } from "./repositories/agent-profile.repo.js";
import { SupportTicketRepo } from "./repositories/support-ticket.repo.js";

/**
 * Single place both apps/runner and apps/web call to get a fully wired
 * RepositoryBundle. Builds two schema-bound clients under the hood — one
 * for "workforce" (everything AI Workforce owns), one for "public" (Sandbox's
 * own tables, read-only, currently just support_tickets).
 */
export function buildRepositories(url: string, serviceRoleKey: string): RepositoryBundle {
  const workforceClient = createSupabaseClient(url, serviceRoleKey, "workforce");
  const publicClient = createSupabaseClient(url, serviceRoleKey, "public");

  return {
    watchedRepositories: new WatchedRepositoryRepo(workforceClient),
    taskRuns: new TaskRunRepo(workforceClient),
    tasks: new WorkTaskRepo(workforceClient),
    taskEvents: new TaskEventRepo(workforceClient),
    contentBatches: new ContentBatchRepo(workforceClient),
    contentPieces: new ContentPieceRepo(workforceClient),
    contentInsights: new ContentInsightRepo(workforceClient),
    promptVersions: new PromptVersionRepo(workforceClient),
    aiInvocations: new AiInvocationRepo(workforceClient),
    agentProfiles: new AgentProfileRepo(workforceClient),
    supportTickets: new SupportTicketRepo(publicClient),
  };
}
