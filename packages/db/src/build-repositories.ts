import type { SupabaseClient } from "./supabase-client.js";
import type { RepositoryBundle } from "@ai-workforce/core";
import { WatchedRepositoryRepo } from "./repositories/watched-repository.repo.js";
import { TaskRunRepo } from "./repositories/task-run.repo.js";
import { WorkTaskRepo } from "./repositories/work-task.repo.js";
import { TaskEventRepo } from "./repositories/task-event.repo.js";
import { ContentBatchRepo } from "./repositories/content-batch.repo.js";
import { ContentPieceRepo } from "./repositories/content-piece.repo.js";
import { PromptVersionRepo } from "./repositories/prompt-version.repo.js";
import { AiInvocationRepo } from "./repositories/ai-invocation.repo.js";
import { AgentProfileRepo } from "./repositories/agent-profile.repo.js";

/** Single place both apps/runner and apps/web call to get a fully wired RepositoryBundle. */
export function buildRepositories(client: SupabaseClient): RepositoryBundle {
  return {
    watchedRepositories: new WatchedRepositoryRepo(client),
    taskRuns: new TaskRunRepo(client),
    tasks: new WorkTaskRepo(client),
    taskEvents: new TaskEventRepo(client),
    contentBatches: new ContentBatchRepo(client),
    contentPieces: new ContentPieceRepo(client),
    promptVersions: new PromptVersionRepo(client),
    aiInvocations: new AiInvocationRepo(client),
    agentProfiles: new AgentProfileRepo(client),
  };
}
