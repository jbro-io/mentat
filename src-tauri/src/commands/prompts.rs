use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::State;

use crate::error::AppError;
use crate::models::filters::PromptFilter;
use crate::models::prompt::{Prompt, PromptMeta, PromptSummary, PromptType};
use crate::search::engine::SearchEngine;
use crate::store::file_store::FileStore;

#[tauri::command]
pub fn list_prompts(
    store: State<'_, Arc<Mutex<FileStore>>>,
    filter: Option<PromptFilter>,
) -> Result<Vec<PromptSummary>, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    store.list_prompt_summaries(filter)
}

#[tauri::command]
pub fn get_prompt(
    store: State<'_, Arc<Mutex<FileStore>>>,
    file_path: String,
) -> Result<Prompt, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    store.read_prompt(&file_path)
}

#[tauri::command]
pub fn create_prompt(
    store: State<'_, Arc<Mutex<FileStore>>>,
    search: State<'_, Arc<Mutex<SearchEngine>>>,
    prompt: Prompt,
) -> Result<Prompt, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let created = store.create_prompt(&prompt)?;

    // Rebuild search index
    if let Ok(prompts) = store.list_all_prompts() {
        if let Ok(mut engine) = search.lock() {
            engine.rebuild_index(&prompts);
        }
    }

    Ok(created)
}

/// Create a brand-new prompt with sane defaults.
///
/// The caller only needs to provide `title`, `prompt_type`, and optionally `body`.
/// Everything else is auto-generated:
/// - UUID for the id
/// - created/modified set to today
/// - file_path derived from type + slugified title
/// - version defaults to 1
/// - empty tags, target, variables
#[tauri::command]
pub fn create_new_prompt(
    store: State<'_, Arc<Mutex<FileStore>>>,
    search: State<'_, Arc<Mutex<SearchEngine>>>,
    title: String,
    prompt_type: PromptType,
    body: Option<String>,
    tags: Option<Vec<String>>,
    target: Option<Vec<String>>,
) -> Result<Prompt, AppError> {
    if title.trim().is_empty() {
        return Err(AppError::Parse("Title cannot be empty".to_string()));
    }

    let prompt = Prompt {
        meta: PromptMeta {
            id: String::new(), // will be auto-generated
            title,
            prompt_type,
            target: target.unwrap_or_default(),
            tags: tags.unwrap_or_default(),
            version: 1,
            created: String::new(), // will be auto-set
            modified: String::new(), // will be auto-set
            variables: HashMap::new(),
            composable: false,
            insert_point: None,
        },
        body: body.unwrap_or_default(),
        file_path: String::new(), // will be auto-derived
    };

    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let created = store.create_prompt(&prompt)?;

    // Rebuild search index
    if let Ok(prompts) = store.list_all_prompts() {
        if let Ok(mut engine) = search.lock() {
            engine.rebuild_index(&prompts);
        }
    }

    Ok(created)
}

#[tauri::command]
pub fn update_prompt(
    store: State<'_, Arc<Mutex<FileStore>>>,
    search: State<'_, Arc<Mutex<SearchEngine>>>,
    prompt: Prompt,
) -> Result<Prompt, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    store.write_prompt(&prompt)?;

    // Re-read the prompt to get the updated modified date
    let updated = store.read_prompt(&prompt.file_path)?;

    if let Ok(prompts) = store.list_all_prompts() {
        if let Ok(mut engine) = search.lock() {
            engine.rebuild_index(&prompts);
        }
    }

    Ok(updated)
}

#[tauri::command]
pub fn delete_prompt(
    store: State<'_, Arc<Mutex<FileStore>>>,
    search: State<'_, Arc<Mutex<SearchEngine>>>,
    file_path: String,
) -> Result<(), AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    store.delete_prompt(&file_path)?;

    if let Ok(prompts) = store.list_all_prompts() {
        if let Ok(mut engine) = search.lock() {
            engine.rebuild_index(&prompts);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn list_folders(
    store: State<'_, Arc<Mutex<FileStore>>>,
) -> Result<Vec<String>, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    store.list_folders()
}

#[tauri::command]
pub fn list_tags(
    store: State<'_, Arc<Mutex<FileStore>>>,
) -> Result<Vec<String>, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    store.list_all_tags()
}
