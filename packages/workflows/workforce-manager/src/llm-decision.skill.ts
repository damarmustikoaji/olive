import type { ExecutionContext, Skill, Task, ToolLoopMessage } from "@ai-workforce/core";
import { renderTemplate } from "@ai-workforce/core";
import { BOARD_TOOLS, type BoardTool } from "./board-tools.js";

export interface AssignTaskDecisionInput extends Record<string, unknown> {
  taskId: string;
  title: string;
  description: string;
  source: string;
  severity: string;
}

export interface AssignTaskDecisionResult {
  /** The model's final text answer once it stops calling tools. */
  summary: string;
  /** How many tool calls it actually made — 0 means it answered without acting. */
  toolCallsMade: number;
}

const MAX_ITERATIONS = 4;
const SKILL_NAME = "assign-task-decision";
const AGENT_NAME = "workforce-manager";

const TOOLS_BY_NAME = new Map<string, BoardTool>(BOARD_TOOLS.map((tool) => [tool.definition.name, tool]));

/**
 * Replaces the Manager's hardcoded `pickAgentFor` switch for a task in
 * `backlog`: instead of a fixed if/else, the LLM sees the task and decides
 * — via `assign_task` / `post_task_comment` tool calls — what should happen
 * next, with its reasoning recorded as a real `task_events` entry rather
 * than a silent `logger.warn`.
 *
 * Deliberately NOT a PromptDrivenSkill subclass: that base class only wraps
 * `aiProvider.complete()` (single text turn), and this needs the bounded
 * multi-turn `completeWithTools()` loop below.
 */
export class AssignTaskDecisionSkill implements Skill<AssignTaskDecisionInput, AssignTaskDecisionResult> {
  readonly name = SKILL_NAME;

  async execute(input: AssignTaskDecisionInput, ctx: ExecutionContext): Promise<AssignTaskDecisionResult> {
    const provider = ctx.aiProvider;
    if (!provider.completeWithTools) {
      throw new Error(`AiProvider "${provider.name}" does not support completeWithTools`);
    }

    const promptVersion = await ctx.repositories.promptVersions.getActive(AGENT_NAME, SKILL_NAME);
    const userPrompt = renderTemplate(promptVersion.userPromptTpl, input);

    const messages: ToolLoopMessage[] = [];
    let toolCallsMade = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const result = await provider.completeWithTools({
        systemPrompt: promptVersion.systemPrompt,
        userPrompt,
        primaryModel: promptVersion.model,
        fallbackModels: promptVersion.fallbackModels,
        tools: BOARD_TOOLS.map((tool) => tool.definition),
        priorMessages: messages,
      });

      await ctx.repositories.aiInvocations.record({
        taskRunId: ctx.taskRunId,
        provider: promptVersion.provider,
        model: result.modelUsed,
        promptVersionId: promptVersion.id,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        latencyMs: result.usage.latencyMs,
        status: "success",
      });

      if (result.toolCalls.length === 0) {
        return { summary: result.text, toolCallsMade };
      }

      messages.push({ role: "assistant", content: result.text || null, toolCalls: result.toolCalls });

      for (const toolCall of result.toolCalls) {
        const tool = TOOLS_BY_NAME.get(toolCall.name);
        const output = tool
          ? await runTool(tool, toolCall.arguments, ctx)
          : `Unknown tool "${toolCall.name}" — no such tool exists.`;
        toolCallsMade++;
        messages.push({ role: "tool", toolCallId: toolCall.id, content: output });
      }
    }

    throw new Error(
      `assign-task-decision tool loop exceeded ${MAX_ITERATIONS} iterations without a final answer (task ${input.taskId})`,
    );
  }
}

async function runTool(tool: BoardTool, args: Record<string, unknown>, ctx: ExecutionContext): Promise<string> {
  try {
    return await tool.execute(args, ctx);
  } catch (err) {
    return `Tool "${tool.definition.name}" failed: ${String(err)}`;
  }
}

export function buildDecisionInput(task: Task): AssignTaskDecisionInput {
  return {
    taskId: task.id,
    title: task.title,
    description: task.description ?? "",
    source: task.source,
    severity: task.severity,
  };
}
