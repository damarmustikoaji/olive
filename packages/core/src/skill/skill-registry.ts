import type { Skill } from "./skill.interface.js";

/**
 * Lets apps/web invoke a single skill by name (e.g. "regenerate just the Instagram piece")
 * without knowing which Agent class owns it.
 */
export class SkillRegistry {
  private static skills = new Map<string, Skill<unknown, unknown>>();

  static register(skill: Skill<unknown, unknown>): void {
    this.skills.set(skill.name, skill);
  }

  static get(name: string): Skill<unknown, unknown> {
    const skill = this.skills.get(name);
    if (!skill) throw new Error(`Skill "${name}" is not registered`);
    return skill;
  }

  static reset(): void {
    this.skills.clear();
  }
}
