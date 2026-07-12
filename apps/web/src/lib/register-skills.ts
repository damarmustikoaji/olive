import { SkillRegistry } from "@ai-workforce/core";
import {
  GenerateBlogSkill,
  GenerateFacebookSkill,
  GenerateInstagramSkill,
  GenerateLinkedinSkill,
  GenerateNewsletterSkill,
  GenerateSeoSkill,
  GenerateThreadsSkill,
  GenerateXSkill,
} from "@ai-workforce/agent-marketing-content-writer";

let registered = false;

/**
 * Lets the "Regenerate" button call a single skill by name without apps/web
 * knowing which Agent class owns it. Idempotent — Next.js can re-evaluate
 * this module across hot reloads/route handlers in the same process.
 */
export function ensureSkillsRegistered(): void {
  if (registered) return;

  SkillRegistry.register(new GenerateBlogSkill());
  SkillRegistry.register(new GenerateLinkedinSkill());
  SkillRegistry.register(new GenerateXSkill());
  SkillRegistry.register(new GenerateFacebookSkill());
  SkillRegistry.register(new GenerateInstagramSkill());
  SkillRegistry.register(new GenerateNewsletterSkill());
  SkillRegistry.register(new GenerateThreadsSkill());
  SkillRegistry.register(new GenerateSeoSkill());

  registered = true;
}
