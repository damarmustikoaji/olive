import type {
  AgentProfile,
  AgentStatus,
  AgentUsageSummary,
  AiInvocationRecord,
  ContentBatch,
  ContentBatchStatus,
  ContentInsight,
  ContentPiece,
  ContentPlatform,
  PromptVersion,
  SupportTicket,
  Task,
  TaskCreatedBy,
  TaskEvent,
  TaskPriority,
  TaskRun,
  TaskSeverity,
  TaskSource,
  TaskStatus,
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
    repositoryId?: string;
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
  markPublished(id: string, publishedUrl: string, publishedMediaId: string): Promise<void>;
  listByBatch(contentBatchId: string): Promise<ContentPiece[]>;
  /** Pieces with a media id to fetch insights for — published, on a platform with an Insights API. */
  listPublishedWithMediaId(params: { platform: ContentPlatform; sincePublishedAt?: Date }): Promise<ContentPiece[]>;
}

export interface ContentInsightRepo {
  record(input: {
    contentPieceId: string;
    views: number;
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
  }): Promise<ContentInsight>;
  listByContentPiece(contentPieceId: string): Promise<ContentInsight[]>;
}

export interface PromptVersionRepo {
  getActive(agentName: string, skillName: string): Promise<PromptVersion>;
}

export interface AiInvocationRepo {
  record(entry: AiInvocationRecord): Promise<void>;
  sumUsageByAgent(agentName: string, sinceDate?: Date): Promise<AgentUsageSummary>;
}

export interface AgentProfileRepo {
  listAll(): Promise<AgentProfile[]>;
  getByAgent(agentName: string): Promise<AgentProfile | null>;
  upsert(input: {
    agentName: string;
    role: string;
    level: string;
    status?: AgentStatus;
    description: string;
  }): Promise<AgentProfile>;
}

/**
 * The backlog. WorkTaskRepo (not "TaskRepo") to keep it unambiguous next to
 * TaskRunRepo, which is an unrelated infra concept (see entities.ts).
 */
export interface WorkTaskRepo {
  getOrCreateBySourceRef(input: {
    title: string;
    description?: string;
    source: TaskSource;
    sourceRef: string;
    severity?: TaskSeverity;
    priority?: TaskPriority;
    payload?: Record<string, unknown>;
  }): Promise<Task>;
  create(input: {
    title: string;
    description?: string;
    source: TaskSource;
    sourceRef?: string;
    severity?: TaskSeverity;
    priority?: TaskPriority;
    payload?: Record<string, unknown>;
    createdBy?: TaskCreatedBy;
  }): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  listByStatus(status: TaskStatus): Promise<Task[]>;
  listAll(limit?: number): Promise<Task[]>;
  assign(id: string, assigneeAgent: string): Promise<void>;
  updateStatus(id: string, status: TaskStatus): Promise<void>;
  updateSeverity(id: string, severity: TaskSeverity): Promise<void>;
  linkContentBatch(id: string, contentBatchId: string): Promise<void>;
}

export interface TaskEventRepo {
  record(taskId: string, event: string, meta?: Record<string, unknown>): Promise<TaskEvent>;
  listByTask(taskId: string): Promise<TaskEvent[]>;
}

/** Read-only. See SupportTicket entity for why this never writes back. */
export interface SupportTicketRepo {
  listOpen(): Promise<SupportTicket[]>;
}

export interface RepositoryBundle {
  watchedRepositories: WatchedRepositoryRepo;
  taskRuns: TaskRunRepo;
  tasks: WorkTaskRepo;
  taskEvents: TaskEventRepo;
  contentBatches: ContentBatchRepo;
  contentPieces: ContentPieceRepo;
  contentInsights: ContentInsightRepo;
  promptVersions: PromptVersionRepo;
  aiInvocations: AiInvocationRepo;
  agentProfiles: AgentProfileRepo;
  supportTickets: SupportTicketRepo;
}
