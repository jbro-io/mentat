use std::sync::{Arc, Mutex};
use tauri::State;

use crate::error::AppError;
use crate::git;
use crate::models::git::{GitStatus, SyncResult};
use crate::search::engine::SearchEngine;
use crate::store::file_store::FileStore;

#[tauri::command]
pub fn git_sync_status(
    store: State<'_, Arc<Mutex<FileStore>>>,
) -> Result<GitStatus, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let path = &store.base_path;

    if !git::is_git_repo(path) {
        return Ok(GitStatus {
            has_changes: false,
            ahead: 0,
            behind: 0,
            branch: String::new(),
            has_remote: false,
        });
    }

    git::git_status(path)
}

#[tauri::command]
pub fn git_sync(
    store: State<'_, Arc<Mutex<FileStore>>>,
    search: State<'_, Arc<Mutex<SearchEngine>>>,
) -> Result<SyncResult, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let path = &store.base_path;

    if !git::is_git_repo(path) {
        return Err(AppError::GitError(
            "Not a git repository. Initialize git first.".to_string(),
        ));
    }

    let result = git::git_sync(path)?;

    // Rebuild search index since files may have changed after pull
    if let Ok(prompts) = store.list_all_prompts() {
        if let Ok(mut engine) = search.lock() {
            engine.rebuild_index(&prompts);
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn git_init(
    store: State<'_, Arc<Mutex<FileStore>>>,
) -> Result<(), AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let path = &store.base_path;

    if git::is_git_repo(path) {
        return Ok(()); // Already initialized
    }

    git::init_repo(path)
}

#[tauri::command]
pub fn git_add_remote(
    store: State<'_, Arc<Mutex<FileStore>>>,
    remote_url: String,
) -> Result<(), AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let path = &store.base_path;

    // Initialize repo if needed
    if !git::is_git_repo(path) {
        git::init_repo(path)?;
    }

    git::add_remote(path, &remote_url)
}

#[tauri::command]
pub fn git_get_remote_url(
    store: State<'_, Arc<Mutex<FileStore>>>,
) -> Result<Option<String>, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let path = &store.base_path;

    if !git::is_git_repo(path) {
        return Ok(None);
    }

    Ok(git::get_remote_url(path))
}
