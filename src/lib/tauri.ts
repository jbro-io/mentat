import { invoke } from "@tauri-apps/api/core";
import type { Prompt, PromptSummary, SearchResult } from "../types/prompt";
import type { PromptFilter } from "../types/filters";

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
  return invoke("create_new_prompt", { title, promptType, body, tags, target });
}

export async function copyToClipboard(text: string): Promise<void> {
  return invoke("copy_to_clipboard", { text });
}
