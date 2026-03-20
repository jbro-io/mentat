use std::process::Command;
use serde::Serialize;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
pub struct TerminalSession {
    /// Display name: "Window 1 > Tab 2: ~/projects/my-app"
    pub label: String,
    /// Identifiers for targeting: "window_id:tab_id:session_id"
    pub id: String,
}

/// List all iTerm2 sessions (windows > tabs > sessions) so the user can pick one.
pub fn list_iterm_sessions() -> Result<Vec<TerminalSession>, AppError> {
    let script = r#"
        set output to ""
        tell application "iTerm2"
            repeat with w from 1 to (count of windows)
                set win to window w
                repeat with t from 1 to (count of tabs of win)
                    set theTab to tab t of win
                    repeat with s from 1 to (count of sessions of theTab)
                        set sess to session s of theTab
                        set sessName to name of sess
                        set sessId to unique ID of sess
                        set winId to id of win
                        set output to output & winId & "	" & t & "	" & sessId & "	" & sessName & linefeed
                    end repeat
                end repeat
            end repeat
        end tell
        return output
    "#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| AppError::Parse(format!("Failed to run osascript: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Parse(format!("AppleScript error: {}", stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut sessions = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 4 {
            let win_id = parts[0];
            let tab_num = parts[1];
            let sess_id = parts[2];
            let sess_name = parts[3];
            let name_lower = sess_name.to_lowercase();

            // Only show sessions running claude or codex
            if name_lower.contains("claude") || name_lower.contains("codex") {
                sessions.push(TerminalSession {
                    label: format!("Window {} / Tab {} — {}", win_id, tab_num, sess_name),
                    id: format!("{}:{}:{}", win_id, tab_num, sess_id),
                });
            }
        }
    }

    Ok(sessions)
}

/// Send text to a specific iTerm2 session by its unique ID.
/// Sets clipboard and pastes to avoid issues with special characters.
pub fn send_to_iterm_session(session_id: &str, text: &str) -> Result<(), AppError> {
    let escaped = text
        .replace('\\', "\\\\")
        .replace('"', "\\\"");

    // Parse the composite ID to get the session unique ID
    let sess_unique_id = session_id
        .rsplit(':')
        .next()
        .unwrap_or(session_id);

    let script = format!(
        r#"
        set the clipboard to "{text}"
        tell application "iTerm2"
            repeat with w in windows
                repeat with t in tabs of w
                    repeat with s in sessions of t
                        if unique ID of s is "{sid}" then
                            select s
                            activate
                            delay 0.1
                            tell application "System Events"
                                keystroke "v" using command down
                            end tell
                            return
                        end if
                    end repeat
                end repeat
            end repeat
        end tell
        "#,
        text = escaped,
        sid = sess_unique_id,
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| AppError::Parse(format!("Failed to run osascript: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Parse(format!("AppleScript error: {}", stderr)));
    }

    Ok(())
}
