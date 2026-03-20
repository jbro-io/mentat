use std::sync::{Arc, Mutex};
use tauri::State;

use crate::error::AppError;
use crate::search::engine::{SearchEngine, SearchResult};
use crate::store::file_store::FileStore;

#[tauri::command]
pub fn fuzzy_search(
    search: State<'_, Arc<Mutex<SearchEngine>>>,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, AppError> {
    let engine = search.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    Ok(engine.search(&query, limit.unwrap_or(20)))
}

#[tauri::command]
pub fn rebuild_search_index(
    store: State<'_, Arc<Mutex<FileStore>>>,
    search: State<'_, Arc<Mutex<SearchEngine>>>,
) -> Result<(), AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let prompts = store.list_all_prompts()?;
    let mut engine = search.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    engine.rebuild_index(&prompts);
    Ok(())
}
