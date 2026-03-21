export interface McpServer {
  name: string;
  command?: string;
  args?: string[];
  server_type?: string;
  url?: string;
  env: Record<string, string>;
}

export interface Hook {
  event: string;
  matcher: string;
  hook_type: string;
  command: string;
}

export interface ClaudeProjectConfig {
  path: string;
  name: string;
  mcp_servers: McpServer[];
  hooks: Hook[];
  permissions: string[];
  settings: Record<string, unknown>;
  has_claude_md: boolean;
  claude_md_preview?: string;
  plugins: string[];
}

export interface GlobalConfig {
  mcp_servers: McpServer[];
  hooks: Hook[];
  plugins: string[];
  settings: Record<string, unknown>;
}

export interface ClaudeProject {
  name: string;
  path: string;
  has_mcp: boolean;
  has_claude_md: boolean;
  has_settings: boolean;
}

export interface McpWithProjects {
  server: McpServer;
  projects: { name: string; path: string }[];
  isGlobal: boolean;
}
