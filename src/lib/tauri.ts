import { invoke } from "@tauri-apps/api/core";
import type { Prompt, PromptSummary, SearchResult } from "../types/prompt";
import type { PromptFilter } from "../types/filters";
import type { GitStatus, SyncResult } from "../types/git";
import type { ProjectConfig, ProjectSummary } from "../types/project";
import type {
  ClaudeProject,
  ClaudeProjectConfig,
  GlobalConfig,
} from "../types/claude-config";

export async function listPrompts(filter?: PromptFilter): Promise<PromptSummary[]> {
  return invoke("list_prompts", { filter: filter ?? null });
}

export async function getPrompt(filePath: string): Promise<Prompt> {
  return invoke("get_prompt", { filePath });
}

export async function createPrompt(prompt: Prompt): Promise<Prompt> {
  return invoke("create_prompt", { prompt });
}

export async function updatePrompt(prompt: Prompt): Promise<Prompt> {
  return invoke("update_prompt", { prompt });
}

export async function deletePrompt(filePath: string): Promise<void> {
  return invoke("delete_prompt", { filePath });
}

export async function listFolders(): Promise<string[]> {
  return invoke("list_folders");
}

export async function listTags(): Promise<string[]> {
  return invoke("list_tags");
}

export async function fuzzySearch(query: string, limit?: number): Promise<SearchResult[]> {
  return invoke("fuzzy_search", { query, limit: limit ?? null });
}

export async function createNewPrompt(
  title: string,
  promptType: string,
  body?: string,
  tags?: string[],
  target?: string[],
): Promise<Prompt> {
  return invoke("create_new_prompt", {
    title,
    promptType,
    body: body ?? null,
    tags: tags ?? null,
    target: target ?? null,
  });
}

export async function copyToClipboard(text: string): Promise<void> {
  return invoke("copy_to_clipboard", { text });
}

export async function gitSyncStatus(): Promise<GitStatus> {
  return invoke("git_sync_status");
}

export async function gitSync(): Promise<SyncResult> {
  return invoke("git_sync");
}

export async function gitInit(): Promise<void> {
  return invoke("git_init");
}

export async function gitAddRemote(remoteUrl: string): Promise<void> {
  return invoke("git_add_remote", { remoteUrl });
}

export async function gitGetRemoteUrl(): Promise<string | null> {
  return invoke("git_get_remote_url");
}

export async function resolvePrompt(
  body: string,
  variableValues: Record<string, string>,
): Promise<string> {
  return invoke("resolve_prompt", { body, variableValues });
}

export async function exportPrompt(
  resolvedText: string,
  outputPath: string,
): Promise<void> {
  return invoke("export_prompt", { resolvedText, outputPath });
}

export async function composePrompts(filePaths: string[]): Promise<Prompt> {
  return invoke("compose_prompts", { filePaths });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return invoke("list_projects");
}

export async function getProject(name: string): Promise<ProjectConfig> {
  return invoke("get_project", { name });
}

// Settings
export async function loadSettings(): Promise<string> {
  return invoke("load_settings");
}

export async function saveSettings(settings: string): Promise<void> {
  return invoke("save_settings", { settings });
}

export async function getEnvVar(name: string): Promise<string> {
  return invoke("get_env_var", { name });
}

export async function writeFile(path: string, contents: string): Promise<void> {
  return invoke("write_file", { path, contents });
}

export async function readFile(path: string): Promise<string> {
  return invoke("read_file", { path });
}

// PTY commands for embedded Neovim (kept for temp file cleanup)
export async function ptySpawn(
  id: string,
  body: string,
  rows: number,
  cols: number,
): Promise<void> {
  return invoke("pty_spawn", { id, body, rows, cols });
}

export async function ptyWrite(id: string, data: string): Promise<void> {
  return invoke("pty_write", { id, data });
}

export async function ptyReadTemp(id: string): Promise<string> {
  return invoke("pty_read_temp", { id });
}

export async function ptyResize(
  id: string,
  rows: number,
  cols: number,
): Promise<void> {
  return invoke("pty_resize", { id, rows, cols });
}

export async function ptyClose(id: string): Promise<void> {
  return invoke("pty_close", { id });
}

// Terminal integration
export interface TerminalSession {
  label: string;
  id: string;
}

export async function listTerminalSessions(): Promise<TerminalSession[]> {
  return invoke("list_terminal_sessions");
}

export async function sendToTerminal(sessionId: string, text: string): Promise<void> {
  return invoke("send_to_terminal", { sessionId, text });
}

// Claude Code config
export async function listClaudeProjects(): Promise<ClaudeProject[]> {
  return invoke("list_claude_projects");
}

export async function getClaudeProjectConfig(path: string): Promise<ClaudeProjectConfig> {
  return invoke("get_claude_project_config", { path });
}

export async function getGlobalClaudeConfig(): Promise<GlobalConfig> {
  return invoke("get_global_claude_config");
}

export async function installMcpToProject(
  projectPath: string,
  name: string,
  command?: string,
  args?: string[],
  serverType?: string,
  url?: string,
  env?: Record<string, string>,
): Promise<void> {
  return invoke("install_mcp_to_project", {
    projectPath,
    name,
    command: command ?? null,
    args: args ?? null,
    serverType: serverType ?? null,
    url: url ?? null,
    env: env ?? {},
  });
}

// Scratches
export interface ScratchFile {
  name: string;
  path: string;
  language: string;
  extension: string;
}

export async function listScratches(): Promise<ScratchFile[]> {
  return invoke("list_scratches");
}

export async function createScratch(name: string, language: string): Promise<ScratchFile> {
  return invoke("create_scratch", { name, language });
}

export async function deleteScratch(path: string): Promise<void> {
  return invoke("delete_scratch", { path });
}

export async function readScratch(path: string): Promise<string> {
  return invoke("read_scratch", { path });
}

export async function writeScratch(path: string, content: string): Promise<void> {
  return invoke("write_scratch", { path, content });
}

export async function installMcpGlobally(
  name: string,
  command?: string,
  args?: string[],
  serverType?: string,
  url?: string,
  env?: Record<string, string>,
): Promise<void> {
  return invoke("install_mcp_globally", {
    name,
    command: command ?? null,
    args: args ?? null,
    serverType: serverType ?? null,
    url: url ?? null,
    env: env ?? {},
  });
}
