export interface ContentWriterInput extends Record<string, unknown> {
  releaseTitle: string;
  releaseBody: string;
}

export const AGENT_NAME = "marketing-content-writer";
