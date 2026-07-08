import type {
  AiInvocationRecord,
  ContentBatch,
  ContentBatchStatus,
  ContentPiece,
  ContentPlatform,
  PromptVersion,
  TaskRun,
  WatchedRepository,
} from "./entities.js";

export interface WatchedRepositoryRepo {
  getActive(): Promise<WatchedRepository[]>;
  listAll(): Promise<WatchedRepository[]>;
  create(input: { owner: string; repo: string; isActive?: boolean }): Promise<WatchedRepository>;
  setActive(id: string, isActive: boolean): Promise<void>;
  updateCheckpoint(id: string, releaseTag: string): Promise<void>;
}

export interface TaskRunRepo {
  getOrCreate(params: { workflowName: string; agentName?: string; triggerRef: string }): Promise<TaskRun>;
  markRunning(id: string): Promise<void>;
  markDone(id: string): Promise<void>;
  markFailed(id: string, error: unknown): Promise<void>;
  resetForRetry(id: string): Promise<void>;
  listRecent(limit?: number): Promise<TaskRun[]>;
}

export interface ContentBatchRepo {
  create(input: {
    taskRunId: string;
    repositoryId: string;
    releaseTag: string;
    releaseTitle: string;
    releaseBody: string;
  }): Promise<ContentBatch>;
  findById(id: string): Promise<ContentBatch | null>;
  updateStatus(id: string, status: ContentBatchStatus): Promise<void>;
  listRecent(params?: { status?: ContentBatchStatus; limit?: number }): Promise<ContentBatch[]>;
}

export interface ContentPieceRepo {
  create(input: {
    contentBatchId: string;
    platform: ContentPlatform;
    content: string;
    seoTitle?: string;
    seoDescription?: string;
    hashtags?: string[];
  }): Promise<ContentPiece>;
  upsertByBatchAndPlatform(
    contentBatchId: string,
    platform: ContentPlatform,
    fields: Partial<Pick<ContentPiece, "content" | "seoTitle" | "seoDescription" | "hashtags">>,
  ): Promise<ContentPiece>;
  update(
    id: string,
    fields: Partial<Pick<ContentPiece, "content" | "reviewedAt" | "reviewedBy">>,
  ): Promise<void>;
  listByBatch(contentBatchId: string): Promise<ContentPiece[]>;
}

export interface PromptVersionRepo {
  getActive(agentName: string, skillName: string): Promise<PromptVersion>;
}

export interface AiInvocationRepo {
  record(entry: AiInvocationRecord): Promise<void>;
}

export interface RepositoryBundle {
  watchedRepositories: WatchedRepositoryRepo;
  taskRuns: TaskRunRepo;
  contentBatches: ContentBatchRepo;
  contentPieces: ContentPieceRepo;
  promptVersions: PromptVersionRepo;
  aiInvocations: AiInvocationRepo;
}
