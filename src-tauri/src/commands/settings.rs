use std::sync::{Arc, Mutex};
use tauri::State;

use crate::error::AppError;
use crate::store::file_store::FileStore;

/// Read ~/.mentat/settings.json and return its contents as a JSON string.
/// Returns "{}" if the file doesn't exist yet.
#[tauri::command]
pub fn load_settings(
    store: State<'_, Arc<Mutex<FileStore>>>,
) -> Result<String, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let path = store.base_path.join("settings.json");

    if !path.exists() {
        return Ok("{}".to_string());
    }

    std::fs::read_to_string(&path).map_err(AppError::Io)
}

/// Write JSON string to ~/.mentat/settings.json.
#[tauri::command]
pub fn save_settings(
    store: State<'_, Arc<Mutex<FileStore>>>,
    settings: String,
) -> Result<(), AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let path = store.base_path.join("settings.json");
    std::fs::write(&path, settings).map_err(AppError::Io)
}
