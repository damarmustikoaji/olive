import type { Agent, ContentPlatform, ExecutionContext, Skill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "./types.js";
import {
  GenerateBlogSkill,
  GenerateFacebookSkill,
  GenerateInstagramSkill,
  GenerateLinkedinSkill,
  GenerateNewsletterSkill,
  GenerateSeoSkill,
  GenerateXSkill,
  type SeoOutput,
} from "./skills/index.js";

export interface ContentWriterAgentInput extends ContentWriterInput {
  contentBatchId: string;
}

export interface ContentWriterResult {
  piecesGenerated: number;
  piecesFailed: string[];
}

const SKILL_TO_PLATFORM: Record<string, ContentPlatform> = {
  "generate-blog": "blog",
  "generate-linkedin": "linkedin",
  "generate-x": "x",
  "generate-facebook": "facebook",
  "generate-instagram": "instagram",
  "generate-newsletter": "newsletter",
};

export class MarketingContentWriterAgent implements Agent<ContentWriterAgentInput, ContentWriterResult> {
  readonly name = AGENT_NAME;

  private readonly textSkills: Skill<ContentWriterInput, string>[] = [
    new GenerateBlogSkill(),
    new GenerateLinkedinSkill(),
    new GenerateXSkill(),
    new GenerateFacebookSkill(),
    new GenerateInstagramSkill(),
    new GenerateNewsletterSkill(),
  ];

  private readonly seoSkill = new GenerateSeoSkill();

  async run(input: ContentWriterAgentInput, ctx: ExecutionContext): Promise<ContentWriterResult> {
    let piecesGenerated = 0;
    const piecesFailed: string[] = [];

    // A single failing skill must not fail the whole batch — every other
    // platform that succeeds should still be reviewable in the dashboard.
    for (const skill of this.textSkills) {
      try {
        const content = await skill.execute(input, ctx);
        await ctx.repositories.contentPieces.create({
          contentBatchId: input.contentBatchId,
          platform: SKILL_TO_PLATFORM[skill.name]!,
          content,
        });
        piecesGenerated++;
      } catch (err) {
        ctx.logger.error(`skill ${skill.name} failed`, { error: String(err) });
        piecesFailed.push(skill.name);
      }
    }

    try {
      const seo: SeoOutput = await this.seoSkill.execute(input, ctx);
      await ctx.repositories.contentPieces.create({
        contentBatchId: input.contentBatchId,
        platform: "seo",
        content: seo.seoTitle,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        hashtags: seo.hashtags,
      });
      piecesGenerated++;
    } catch (err) {
      ctx.logger.error(`skill ${this.seoSkill.name} failed`, { error: String(err) });
      piecesFailed.push(this.seoSkill.name);
    }

    return { piecesGenerated, piecesFailed };
  }
}
