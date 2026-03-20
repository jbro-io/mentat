use std::sync::{Arc, Mutex};
use tauri::State;

use crate::error::AppError;
use crate::models::project::{ProjectConfig, ProjectSummary};
use crate::store::file_store::FileStore;

#[tauri::command]
pub fn list_projects(
    store: State<'_, Arc<Mutex<FileStore>>>,
) -> Result<Vec<ProjectSummary>, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    crate::projects::list_projects(&store.base_path)
}

#[tauri::command]
pub fn get_project(
    store: State<'_, Arc<Mutex<FileStore>>>,
    name: String,
) -> Result<ProjectConfig, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    crate::projects::get_project(&store.base_path, &name)
}
