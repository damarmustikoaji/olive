import type { ExecutionContext, TaskStatus, ToolDefinition } from "@ai-workforce/core";

// Co-located here (not in @ai-workforce/core) because WorkforceManagerWorkflow
// is the sole tool-calling decision-maker over task state — see the design
// note on completeWithTools usage in workforce-manager.workflow.ts. No other
// workflow should import these.

const ASSIGNABLE_AGENTS = ["marketing-content-writer", "support-agent", "workforce-manager"] as const;

const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "assigned",
  "in_progress",
  "ready_for_review",
  "approved",
  "done",
  "rejected",
  "failed",
];

export interface BoardTool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>, ctx: ExecutionContext): Promise<string>;
}

function requireString(args: Record<string, unknown>, field: string): string {
  const value = args[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`tool call missing required string field "${field}"`);
  }
  return value;
}

/** Same effect as the Manager's own hardcoded pickAgentFor + assignStage, just LLM-driven. */
export const assignTaskTool: BoardTool = {
  definition: {
    name: "assign_task",
    description:
      "Assign this task to a specialist agent, moving it from backlog into that agent's queue (status becomes 'assigned').",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The task's UUID." },
        agentName: {
          type: "string",
          description: "Which specialist should handle this task.",
          enum: [...ASSIGNABLE_AGENTS],
        },
      },
      required: ["taskId", "agentName"],
    },
  },
  async execute(args, ctx) {
    const taskId = requireString(args, "taskId");
    const agentName = requireString(args, "agentName");
    await ctx.repositories.tasks.assign(taskId, agentName);
    await ctx.repositories.taskEvents.record(taskId, "assigned", { assigneeAgent: agentName });
    return `Task assigned to ${agentName}`;
  },
};

/**
 * `reasoning` is required specifically so `task_events` carries a real
 * decision trace visible on the task's timeline in the board UI, instead of
 * a silent status flip.
 */
export const updateTaskStatusTool: BoardTool = {
  definition: {
    name: "update_task_status",
    description:
      "Move this task to a new board status. Always explain why — your reasoning is shown on the task's timeline.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The task's UUID." },
        status: { type: "string", description: "The new status.", enum: TASK_STATUSES },
        reasoning: {
          type: "string",
          description: "Why this status change is correct. Shown to the Owner on the task's timeline.",
        },
      },
      required: ["taskId", "status", "reasoning"],
    },
  },
  async execute(args, ctx) {
    const taskId = requireString(args, "taskId");
    const status = requireString(args, "status") as TaskStatus;
    const reasoning = requireString(args, "reasoning");
    await ctx.repositories.tasks.updateStatus(taskId, status);
    await ctx.repositories.taskEvents.record(taskId, "status_changed_by_manager_llm", { status, reasoning });
    return `Task status changed to ${status}`;
  },
};

/** Lets the LLM explain ambiguous cases directly on the task's timeline instead of silently leaving it in backlog. */
export const postTaskCommentTool: BoardTool = {
  definition: {
    name: "post_task_comment",
    description: "Leave a note on the task's timeline without changing its status.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "The task's UUID." },
        comment: { type: "string", description: "The note to leave for the Owner." },
      },
      required: ["taskId", "comment"],
    },
  },
  async execute(args, ctx) {
    const taskId = requireString(args, "taskId");
    const comment = requireString(args, "comment");
    await ctx.repositories.taskEvents.record(taskId, "manager_comment", { comment });
    return "Comment posted to task timeline";
  },
};

export const BOARD_TOOLS: BoardTool[] = [assignTaskTool, updateTaskStatusTool, postTaskCommentTool];
