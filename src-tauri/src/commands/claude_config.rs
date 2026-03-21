use std::collections::HashMap;

use crate::claude_config;
use crate::error::AppError;
use crate::models::claude_config::{ClaudeProject, ClaudeProjectConfig, GlobalConfig, McpServer};

#[tauri::command]
pub fn list_claude_projects() -> Result<Vec<ClaudeProject>, AppError> {
    claude_config::list_claude_projects()
}

#[tauri::command]
pub fn get_claude_project_config(path: String) -> Result<ClaudeProjectConfig, AppError> {
    claude_config::read_project_config(&path)
}

#[tauri::command]
pub fn get_global_claude_config() -> Result<GlobalConfig, AppError> {
    claude_config::read_global_config()
}

#[tauri::command]
pub fn install_mcp_to_project(
    project_path: String,
    name: String,
    command: Option<String>,
    args: Option<Vec<String>>,
    server_type: Option<String>,
    url: Option<String>,
    env: HashMap<String, String>,
) -> Result<(), AppError> {
    let server = McpServer {
        name,
        command,
        args,
        server_type,
        url,
        env,
    };
    claude_config::install_mcp_to_project(&project_path, server)
}

#[tauri::command]
pub fn install_mcp_globally(
    name: String,
    command: Option<String>,
    args: Option<Vec<String>>,
    server_type: Option<String>,
    url: Option<String>,
    env: HashMap<String, String>,
) -> Result<(), AppError> {
    let server = McpServer {
        name,
        command,
        args,
        server_type,
        url,
        env,
    };
    claude_config::install_mcp_globally(server)
}
