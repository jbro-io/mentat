use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServer {
    pub name: String,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub server_type: Option<String>,
    pub url: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hook {
    pub event: String,
    pub matcher: String,
    pub hook_type: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeProjectConfig {
    pub path: String,
    pub name: String,
    pub mcp_servers: Vec<McpServer>,
    pub hooks: Vec<Hook>,
    pub permissions: Vec<String>,
    pub settings: HashMap<String, serde_json::Value>,
    pub has_claude_md: bool,
    pub claude_md_preview: Option<String>,
    pub plugins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalConfig {
    pub mcp_servers: Vec<McpServer>,
    pub hooks: Vec<Hook>,
    pub plugins: Vec<String>,
    pub settings: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeProject {
    pub name: String,
    pub path: String,
    pub has_mcp: bool,
    pub has_claude_md: bool,
    pub has_settings: bool,
}
