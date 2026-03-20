import { invoke } from "@tauri-apps/api/core";
import type { Prompt, PromptSummary, SearchResult } from "../types/prompt";
import type { PromptFilter } from "../types/filters";
import type { GitStatus, SyncResult } from "../types/git";
import type { ProjectConfig, ProjectSummary } from "../types/project";

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

// PTY commands for embedded Neovim
export async function ptySpawn(
  id: string,
  body: string,
  rows: number,
  cols: number,
): Promise<void> {
  return invoke("pty_spawn", { id, body, rows, cols });
}

export async function ptyWrite(id: string, data: number[]): Promise<void> {
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
