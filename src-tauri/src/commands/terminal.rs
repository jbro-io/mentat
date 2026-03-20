use crate::error::AppError;
use crate::terminal::{self, TerminalSession};

/// List all iTerm2 sessions so the user can pick which one to send to.
#[tauri::command]
pub fn list_terminal_sessions() -> Result<Vec<TerminalSession>, AppError> {
    terminal::list_iterm_sessions()
}

/// Send resolved prompt text to a specific iTerm2 session.
#[tauri::command]
pub fn send_to_terminal(session_id: String, text: String) -> Result<(), AppError> {
    terminal::send_to_iterm_session(&session_id, &text)
}
