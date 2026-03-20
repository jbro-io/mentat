use std::io::Read;
use std::sync::{Arc, Mutex};

use base64::Engine;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::error::AppError;
use crate::pty::PtyManager;

#[derive(Clone, Serialize)]
struct PtyOutput {
    id: String,
    data: String, // base64-encoded, color-fixed bytes
}

#[derive(Clone, Serialize)]
struct PtySignal {
    id: String,
    signal: String,
}

#[derive(Clone, Serialize)]
struct PtyExited {
    id: String,
}

/// Fix neovim's colon-separated true-color SGR sequences in-place.
/// Converts `\x1b[38:2:R:G:Bm` → `\x1b[38;2;R;G;Bm` (same for 48).
/// This is done in Rust to avoid regex overhead in JS on every frame.
fn fix_color_sequences(data: &mut Vec<u8>) {
    if data.len() < 10 {
        return;
    }
    let mut i = 0;
    while i + 9 < data.len() {
        // Look for ESC [ followed by 3 or 4, then 8, then :
        if data[i] == 0x1b && data[i + 1] == b'[' {
            let start = i + 2;
            // Check for 38: or 48:
            if start + 2 < data.len()
                && (data[start] == b'3' || data[start] == b'4')
                && data[start + 1] == b'8'
                && data[start + 2] == b':'
            {
                // Check for :2: after the 38/48
                if start + 4 < data.len() && data[start + 3] == b'2' && data[start + 4] == b':' {
                    // Replace all colons with semicolons until 'm'
                    let mut j = start + 2;
                    while j < data.len() && data[j] != b'm' {
                        if data[j] == b':' {
                            data[j] = b';';
                        }
                        j += 1;
                    }
                    i = j + 1;
                    continue;
                }
            }
        }
        i += 1;
    }
}

/// Extract and remove custom OSC signals from the byte buffer.
/// Returns a list of signal names found (e.g. "save-prompt", "focus-prompt-list").
fn extract_signals(data: &mut Vec<u8>) -> Vec<String> {
    let mut signals = Vec::new();
    let prefix = b"\x1b]9999;";
    let suffix = b"\x07";

    loop {
        let Some(start) = data
            .windows(prefix.len())
            .position(|w| w == prefix)
        else {
            break;
        };

        let search_start = start + prefix.len();
        let Some(end_offset) = data[search_start..]
            .windows(suffix.len())
            .position(|w| w == suffix)
        else {
            break;
        };

        let signal_end = search_start + end_offset;
        let signal = String::from_utf8_lossy(&data[search_start..signal_end]).to_string();
        signals.push(signal);

        // Remove the entire OSC sequence from the buffer
        let remove_end = signal_end + suffix.len();
        data.drain(start..remove_end);
    }

    signals
}

/// Spawn a background thread that reads PTY output, fixes colors,
/// extracts signals, and emits base64 events immediately per read.
fn start_reader_thread(
    app_handle: AppHandle,
    id: String,
    mut reader: Box<dyn Read + Send>,
) {
    std::thread::spawn(move || {
        let mut buf = [0u8; 16384];
        let b64 = base64::engine::general_purpose::STANDARD;

        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = app_handle.emit("pty-exited", PtyExited { id });
                    break;
                }
                Ok(n) => {
                    let mut data = buf[..n].to_vec();

                    fix_color_sequences(&mut data);
                    let signals = extract_signals(&mut data);

                    for signal in signals {
                        let _ = app_handle.emit(
                            "pty-signal",
                            PtySignal {
                                id: id.clone(),
                                signal,
                            },
                        );
                    }

                    if !data.is_empty() {
                        let encoded = b64.encode(&data);
                        let _ = app_handle.emit(
                            "pty-output",
                            PtyOutput {
                                id: id.clone(),
                                data: encoded,
                            },
                        );
                    }
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

/// Write user input to the PTY. Accepts a string (keystrokes are UTF-8).
#[tauri::command]
pub fn pty_write(
    pty_manager: State<'_, Arc<Mutex<PtyManager>>>,
    id: String,
    data: String,
) -> Result<(), AppError> {
    let mut manager = pty_manager
        .lock()
        .map_err(|e| AppError::PtyError(format!("Lock error: {}", e)))?;

    manager.write_to_pty(&id, data.as_bytes())
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

    let temp_path = std::env::temp_dir().join(format!("mentat-edit-{}.md", id));
    let _ = std::fs::remove_file(&temp_path);

    Ok(())
}
