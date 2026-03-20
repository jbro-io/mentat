export type PromptType = "system-prompt" | "skill" | "template" | "snippet";
export type InsertPoint = "system" | "context" | "task" | "rules" | "output-format";

export interface VariableDefinition {
  default?: string;
  description?: string;
  options?: string[];
}

export interface PromptMeta {
  id: string;
  title: string;
  type: PromptType;
  target: string[];
  tags: string[];
  version: number;
  created: string;
  modified: string;
  variables: Record<string, VariableDefinition>;
  composable: boolean;
  insert_point?: InsertPoint;
}

export interface Prompt {
  meta: PromptMeta;
  body: string;
  file_path: string;
}

export interface PromptSummary {
  id: string;
  title: string;
  prompt_type: PromptType;
  target: string[];
  tags: string[];
  modified: string;
  file_path: string;
}

export interface SearchResult {
  id: string;
  title: string;
  file_path: string;
  score: number;
  matched_field: string;
}
