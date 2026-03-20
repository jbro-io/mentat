use std::io::Read;
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::error::AppError;
use crate::pty::PtyManager;

#[derive(Clone, Serialize)]
struct PtyOutput {
    id: String,
    data: Vec<u8>,
}

#[derive(Clone, Serialize)]
struct PtyExited {
    id: String,
}

/// Spawn a background thread that reads PTY output and emits Tauri events.
fn start_reader_thread(
    app_handle: AppHandle,
    id: String,
    mut reader: Box<dyn Read + Send>,
) {
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = app_handle.emit("pty-exited", PtyExited { id });
                    break;
                }
                Ok(n) => {
                    let _ = app_handle.emit(
                        "pty-output",
                        PtyOutput {
                            id: id.clone(),
                            data: buf[..n].to_vec(),
                        },
                    );
                }
                Err(_) => {
                    let _ = app_handle.emit("pty-exited", PtyExited { id });
                    break;
                }
            }
        }
    });
}

/// Spawn neovim editing a temp file containing just the prompt body.
/// The temp file isolates the body from the YAML frontmatter.
#[tauri::command]
pub fn pty_spawn(
    app_handle: AppHandle,
    pty_manager: State<'_, Arc<Mutex<PtyManager>>>,
    id: String,
    body: String,
    rows: u16,
    cols: u16,
) -> Result<(), AppError> {
    let temp_path = std::env::temp_dir().join(format!("mentat-edit-{}.md", id));
    std::fs::write(&temp_path, &body).map_err(AppError::Io)?;

    let temp_path_str = temp_path
        .to_str()
        .ok_or_else(|| AppError::InvalidPath("Invalid temp path".to_string()))?
        .to_string();

    let mut manager = pty_manager
        .lock()
        .map_err(|e| AppError::PtyError(format!("Lock error: {}", e)))?;

    let reader = manager.spawn_editor(&id, &temp_path_str, rows, cols)?;

    start_reader_thread(app_handle, id, reader);

    Ok(())
}

#[tauri::command]
pub fn pty_write(
    pty_manager: State<'_, Arc<Mutex<PtyManager>>>,
    id: String,
    data: Vec<u8>,
) -> Result<(), AppError> {
    let mut manager = pty_manager
        .lock()
        .map_err(|e| AppError::PtyError(format!("Lock error: {}", e)))?;

    manager.write_to_pty(&id, &data)
}

/// Read the current contents of the temp file (after neovim :w).
#[tauri::command]
pub fn pty_read_temp(id: String) -> Result<String, AppError> {
    let temp_path = std::env::temp_dir().join(format!("mentat-edit-{}.md", id));
    std::fs::read_to_string(&temp_path).map_err(AppError::Io)
}

#[tauri::command]
pub fn pty_resize(
    pty_manager: State<'_, Arc<Mutex<PtyManager>>>,
    id: String,
    rows: u16,
    cols: u16,
) -> Result<(), AppError> {
    let mut manager = pty_manager
        .lock()
        .map_err(|e| AppError::PtyError(format!("Lock error: {}", e)))?;

    manager.resize_pty(&id, rows, cols)
}

#[tauri::command]
pub fn pty_close(
    pty_manager: State<'_, Arc<Mutex<PtyManager>>>,
    id: String,
) -> Result<(), AppError> {
    let mut manager = pty_manager
        .lock()
        .map_err(|e| AppError::PtyError(format!("Lock error: {}", e)))?;

    manager.close_session(&id)?;

    // Clean up temp file
    let temp_path = std::env::temp_dir().join(format!("mentat-edit-{}.md", id));
    let _ = std::fs::remove_file(&temp_path);

    Ok(())
}
