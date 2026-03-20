import type { PromptType } from "./prompt";

export interface PromptFilter {
  tags?: string[];
  prompt_type?: PromptType;
  target?: string;
  folder?: string;
}
