use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::error::AppError;

#[tauri::command]
pub fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), AppError> {
    app.clipboard()
        .write_text(&text)
        .map_err(|e| AppError::Parse(format!("Clipboard error: {}", e)))?;
    Ok(())
}
