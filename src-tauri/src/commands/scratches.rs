use std::sync::{Arc, Mutex};
use serde::Serialize;
use tauri::State;

use crate::error::AppError;
use crate::store::file_store::FileStore;

#[derive(Debug, Clone, Serialize)]
pub struct ScratchFile {
    pub name: String,
    pub path: String,
    pub language: String,
    pub extension: String,
}

fn extension_for_language(language: &str) -> &'static str {
    match language {
        "typescript" => ".ts",
        "rust" => ".rs",
        "python" => ".py",
        "sql" => ".sql",
        _ => ".md", // "text" or unknown
    }
}

fn language_for_extension(ext: &str) -> &'static str {
    match ext {
        "ts" => "typescript",
        "rs" => "rust",
        "py" => "python",
        "sql" => "sql",
        "md" => "text",
        _ => "text",
    }
}

#[tauri::command]
pub fn list_scratches(
    store: State<'_, Arc<Mutex<FileStore>>>,
) -> Result<Vec<ScratchFile>, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let scratches_dir = store.base_path.join("scratches");

    if !scratches_dir.exists() {
        return Ok(vec![]);
    }

    let mut scratches = Vec::new();
    for entry in std::fs::read_dir(&scratches_dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let ext = path
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let name = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let language = language_for_extension(&ext).to_string();
        let extension = format!(".{}", ext);

        scratches.push(ScratchFile {
            name,
            path: path.to_string_lossy().to_string(),
            language,
            extension,
        });
    }

    // Sort by name for consistent ordering
    scratches.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(scratches)
}

#[tauri::command]
pub fn create_scratch(
    store: State<'_, Arc<Mutex<FileStore>>>,
    name: String,
    language: String,
) -> Result<ScratchFile, AppError> {
    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;
    let scratches_dir = store.base_path.join("scratches");
    std::fs::create_dir_all(&scratches_dir)?;

    let ext = extension_for_language(&language);
    let file_name = format!("{}{}", name, ext);
    let path = scratches_dir.join(&file_name);

    if path.exists() {
        return Err(AppError::InvalidPath(format!(
            "A scratch already exists with name: {}",
            name
        )));
    }

    // Create empty file
    std::fs::write(&path, "")?;

    Ok(ScratchFile {
        name,
        path: path.to_string_lossy().to_string(),
        language,
        extension: ext.to_string(),
    })
}

#[tauri::command]
pub fn delete_scratch(path: String) -> Result<(), AppError> {
    let file_path = std::path::Path::new(&path);
    if !file_path.exists() {
        return Err(AppError::NotFound(format!(
            "Scratch not found: {}",
            path
        )));
    }
    std::fs::remove_file(file_path)?;
    Ok(())
}

#[tauri::command]
pub fn read_scratch(path: String) -> Result<String, AppError> {
    std::fs::read_to_string(&path).map_err(AppError::Io)
}

#[tauri::command]
pub fn write_scratch(path: String, content: String) -> Result<(), AppError> {
    std::fs::write(&path, &content).map_err(AppError::Io)
}
