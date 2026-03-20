export interface ProjectConfig {
  name: string;
  description?: string;
  defaults: Record<string, string>;
}

export interface ProjectSummary {
  name: string;
  description?: string;
  path: string;
}
