import type { Agent, ExecutionContext } from "@ai-workforce/core";
import { GithubRepoClient } from "@ai-workforce/integration-github";
import { AGENT_NAME } from "./types.js";
import { IdentifyRelevantFilesSkill } from "./skills/identify-relevant-files.skill.js";
import { AnalyzeBugSkill } from "./skills/analyze-bug.skill.js";

export interface CodeInvestigatorInput {
  title: string;
  description: string;
}

export interface CodeInvestigatorResult {
  filesChecked: string[];
  analysis: string;
}

const MAX_FILE_CONTENT_CHARS = 20_000;

/**
 * Read-only investigation: look at the repo, form a hypothesis, write it
 * down. Never writes code, never opens a branch/PR — that's a future
 * Developer agent's job, not this one's.
 */
export class CodeInvestigatorAgent implements Agent<CodeInvestigatorInput, CodeInvestigatorResult> {
  readonly name = AGENT_NAME;

  constructor(
    private readonly githubClient: GithubRepoClient,
    private readonly repoOwner: string,
    private readonly repoName: string,
  ) {}

  async run(input: CodeInvestigatorInput, ctx: ExecutionContext): Promise<CodeInvestigatorResult> {
    const fileList = await this.githubClient.listSourceFiles(this.repoOwner, this.repoName);

    const identifySkill = new IdentifyRelevantFilesSkill();
    const candidateFiles = await identifySkill.execute(
      { title: input.title, description: input.description, fileList: fileList.join("\n") },
      ctx,
    );

    let combinedContent = "";
    const filesChecked: string[] = [];
    for (const path of candidateFiles) {
      if (combinedContent.length >= MAX_FILE_CONTENT_CHARS) break;
      const content = await this.githubClient.getFileContent(this.repoOwner, this.repoName, path);
      if (content === null) continue;
      filesChecked.push(path);
      combinedContent += `\n\n=== ${path} ===\n${content.slice(0, MAX_FILE_CONTENT_CHARS - combinedContent.length)}`;
    }

    const analyzeSkill = new AnalyzeBugSkill();
    const analysis = await analyzeSkill.execute(
      {
        title: input.title,
        description: input.description,
        fileContents: combinedContent || "(no candidate files could be read)",
      },
      ctx,
    );

    return { filesChecked, analysis };
  }
}
