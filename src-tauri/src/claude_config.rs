use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::models::claude_config::{
    ClaudeProject, ClaudeProjectConfig, GlobalConfig, Hook, McpServer,
};

/// Read project-level Claude configuration from a given project directory.
pub fn read_project_config(project_path: &str) -> Result<ClaudeProjectConfig, AppError> {
    let path = Path::new(project_path);
    if !path.exists() {
        return Err(AppError::NotFound(format!(
            "Project path does not exist: {}",
            project_path
        )));
    }

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Read .claude/settings.json
    let settings_path = path.join(".claude/settings.json");
    let mut settings: HashMap<String, serde_json::Value> = read_json_map(&settings_path);

    // Merge .claude/settings.local.json
    let local_settings_path = path.join(".claude/settings.local.json");
    let local_settings: HashMap<String, serde_json::Value> = read_json_map(&local_settings_path);
    for (k, v) in local_settings {
        settings.insert(k, v);
    }

    // Extract permissions from settings (nested: permissions.allow is an array)
    let permissions = settings
        .get("permissions")
        .and_then(|v| v.get("allow"))
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    // Extract hooks from settings
    let hooks = extract_hooks(&settings);

    // Extract plugins from settings
    let plugins = extract_string_array(&settings, "plugins");

    // Remove already-extracted keys from the generic settings map
    let display_settings = settings
        .into_iter()
        .filter(|(k, _)| k != "permissions" && k != "hooks" && k != "plugins")
        .collect();

    // Read per-project MCPs from ~/.claude.json -> projects.<path>.mcpServers
    let mut mcp_servers: Vec<McpServer> = Vec::new();
    if let Ok(home) = dirs::home_dir().ok_or(()) {
        let global_config_path = home.join(".claude.json");
        if let Ok(content) = std::fs::read_to_string(&global_config_path) {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(projects) = parsed.get("projects").and_then(|v| v.as_object()) {
                    // Try to match this project's path
                    let project_path_str = path.to_string_lossy().to_string();
                    for (proj_path, proj_config) in projects {
                        if proj_path == &project_path_str {
                            if let Some(servers) = proj_config.get("mcpServers").and_then(|v| v.as_object()) {
                                for (name, config) in servers {
                                    // Skip if already have this server from .mcp.json
                                    if mcp_servers.iter().any(|s| s.name == *name) {
                                        continue;
                                    }
                                    mcp_servers.push(parse_mcp_server(name, config));
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    // Read CLAUDE.md
    let claude_md_path = path.join("CLAUDE.md");
    let has_claude_md = claude_md_path.exists();
    let claude_md_preview = if has_claude_md {
        std::fs::read_to_string(&claude_md_path)
            .ok()
            .map(|content| {
                if content.len() > 500 {
                    let truncated: String = content.chars().take(500).collect();
                    format!("{}...", truncated)
                } else {
                    content
                }
            })
    } else {
        None
    };

    Ok(ClaudeProjectConfig {
        path: project_path.to_string(),
        name,
        mcp_servers,
        hooks,
        permissions,
        settings: display_settings,
        has_claude_md,
        claude_md_preview,
        plugins,
    })
}

/// Read global Claude configuration from ~/.claude/.
pub fn read_global_config() -> Result<GlobalConfig, AppError> {
    let home = dirs::home_dir().ok_or_else(|| AppError::NotFound("Home directory not found".to_string()))?;
    let claude_dir = home.join(".claude");

    // Read ~/.claude/settings.json
    let settings_path = claude_dir.join("settings.json");
    let settings: HashMap<String, serde_json::Value> = read_json_map(&settings_path);

    let hooks = extract_hooks(&settings);

    // Extract enabledPlugins (object with boolean values, e.g. {"context7@claude-plugins-official": true})
    let plugins = settings
        .get("enabledPlugins")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter(|(_, v)| v.as_bool().unwrap_or(false))
                .map(|(k, _)| k.clone())
                .collect()
        })
        .unwrap_or_default();

    let display_settings = settings
        .into_iter()
        .filter(|(k, _)| k != "hooks" && k != "enabledPlugins")
        .collect();

    // Read User MCPs from ~/.claude.json -> mcpServers
    // (NOT ~/.claude/.mcp.json which is stale/unused)
    let mut mcp_servers = Vec::new();
    let global_json_path = home.join(".claude.json");
    if let Ok(content) = std::fs::read_to_string(&global_json_path) {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(servers) = parsed.get("mcpServers").and_then(|v| v.as_object()) {
                for (name, config) in servers {
                    mcp_servers.push(parse_mcp_server(name, config));
                }
            }
        }
    }

    Ok(GlobalConfig {
        mcp_servers,
        hooks,
        plugins,
        settings: display_settings,
    })
}

/// Scan common directories for projects that contain .claude/ or CLAUDE.md.
pub fn list_claude_projects() -> Result<Vec<ClaudeProject>, AppError> {
    let home = dirs::home_dir().ok_or_else(|| AppError::NotFound("Home directory not found".to_string()))?;

    let search_dirs: Vec<PathBuf> = vec![
        home.join("dev"),
        home.join("projects"),
        home.join("src"),
        home.join("code"),
        home.join("repos"),
        home.join("workspace"),
        home.join("work"),
        home.join("Documents"),
    ];

    let mut projects = Vec::new();

    for search_dir in &search_dirs {
        if !search_dir.exists() || !search_dir.is_dir() {
            continue;
        }
        scan_directory_for_claude_projects(search_dir, &mut projects, 2);
    }

    projects.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    projects.dedup_by(|a, b| a.path == b.path);
    Ok(projects)
}

/// Recursively scan a directory up to `max_depth` levels for Claude projects.
fn scan_directory_for_claude_projects(
    dir: &Path,
    projects: &mut Vec<ClaudeProject>,
    max_depth: usize,
) {
    if max_depth == 0 {
        return;
    }

    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        // Skip hidden directories and common non-project directories
        let dir_name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };
        if dir_name.starts_with('.') || dir_name == "node_modules" || dir_name == "target" {
            continue;
        }

        let has_claude_dir = path.join(".claude").exists();
        let has_claude_md = path.join("CLAUDE.md").exists();
        let has_settings = path.join(".claude/settings.json").exists()
            || path.join(".claude/settings.local.json").exists();
        let has_mcp = false; // MCPs come from ~/.claude.json, not local files

        if has_claude_dir || has_claude_md {
            projects.push(ClaudeProject {
                name: dir_name.clone(),
                path: path.to_string_lossy().to_string(),
                has_mcp,
                has_claude_md,
                has_settings,
            });
        } else {
            // Recurse into subdirectories
            scan_directory_for_claude_projects(&path, projects, max_depth - 1);
        }
    }
}

/// Install/update an MCP server entry for a specific project in ~/.claude.json.
///
/// Writes to `projects.<project_path>.mcpServers.<name>` in ~/.claude.json.
pub fn install_mcp_to_project(project_path: &str, server: McpServer) -> Result<(), AppError> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::NotFound("Home directory not found".to_string()))?;
    let global_config_path = home.join(".claude.json");
    install_mcp_to_project_at(project_path, server, &global_config_path)
}

/// Install/update an MCP server as a global (user-level) server in ~/.claude.json.
///
/// Writes to `mcpServers.<name>` at the top level of ~/.claude.json.
pub fn install_mcp_globally(server: McpServer) -> Result<(), AppError> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::NotFound("Home directory not found".to_string()))?;
    let global_config_path = home.join(".claude.json");
    install_mcp_globally_at(server, &global_config_path)
}

/// Internal implementation that accepts a config file path (testable).
fn install_mcp_globally_at(
    server: McpServer,
    global_config_path: &Path,
) -> Result<(), AppError> {
    let mut root: serde_json::Value = if global_config_path.exists() {
        let content = std::fs::read_to_string(global_config_path)?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    if root.get("mcpServers").is_none() {
        root["mcpServers"] = serde_json::json!({});
    }

    let mut server_config = serde_json::Map::new();
    if let Some(ref server_type) = server.server_type {
        server_config.insert("type".to_string(), serde_json::json!(server_type));
    }
    if let Some(ref cmd) = server.command {
        server_config.insert("command".to_string(), serde_json::json!(cmd));
    }
    if let Some(ref args) = server.args {
        server_config.insert("args".to_string(), serde_json::json!(args));
    }
    if let Some(ref url) = server.url {
        server_config.insert("url".to_string(), serde_json::json!(url));
    }
    if !server.env.is_empty() {
        server_config.insert("env".to_string(), serde_json::json!(server.env));
    }

    let mcp_servers = root.get_mut("mcpServers").unwrap();
    mcp_servers[&server.name] = serde_json::Value::Object(server_config);

    let content = serde_json::to_string_pretty(&root)
        .map_err(|e| AppError::Parse(format!("Failed to serialize config: {}", e)))?;
    std::fs::write(global_config_path, content)?;

    Ok(())
}

/// Internal implementation that accepts a config file path (testable).
fn install_mcp_to_project_at(
    project_path: &str,
    server: McpServer,
    global_config_path: &Path,
) -> Result<(), AppError> {
    // Read existing file or start with empty object
    let mut root: serde_json::Value = if global_config_path.exists() {
        let content = std::fs::read_to_string(&global_config_path)?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // Ensure projects object exists
    if root.get("projects").is_none() {
        root["projects"] = serde_json::json!({});
    }

    // Ensure this project's entry exists
    let projects = root.get_mut("projects").unwrap();
    if projects.get(project_path).is_none() {
        projects[project_path] = serde_json::json!({});
    }

    // Ensure mcpServers exists for this project
    let project_entry = projects.get_mut(project_path).unwrap();
    if project_entry.get("mcpServers").is_none() {
        project_entry["mcpServers"] = serde_json::json!({});
    }

    // Build the server config value
    let mut server_config = serde_json::Map::new();
    if let Some(ref cmd) = server.command {
        server_config.insert("command".to_string(), serde_json::json!(cmd));
    }
    if let Some(ref args) = server.args {
        server_config.insert("args".to_string(), serde_json::json!(args));
    }
    if let Some(ref server_type) = server.server_type {
        server_config.insert("type".to_string(), serde_json::json!(server_type));
    }
    if let Some(ref url) = server.url {
        server_config.insert("url".to_string(), serde_json::json!(url));
    }
    if !server.env.is_empty() {
        server_config.insert("env".to_string(), serde_json::json!(server.env));
    }

    // Set the server entry
    let mcp_servers = project_entry.get_mut("mcpServers").unwrap();
    mcp_servers[&server.name] = serde_json::Value::Object(server_config);

    // Write back
    let content = serde_json::to_string_pretty(&root)
        .map_err(|e| AppError::Parse(format!("Failed to serialize config: {}", e)))?;
    std::fs::write(&global_config_path, content)?;

    Ok(())
}

/// Read a JSON file into a HashMap, returning empty map on failure.
fn read_json_map(path: &Path) -> HashMap<String, serde_json::Value> {
    if !path.exists() {
        return HashMap::new();
    }
    match std::fs::read_to_string(path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => HashMap::new(),
    }
}

/// Read MCP servers from a .mcp.json file.
fn read_mcp_servers(path: &Path) -> Vec<McpServer> {
    if !path.exists() {
        return vec![];
    }

    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };

    let parsed: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    let servers_obj = match parsed.get("mcpServers").and_then(|v| v.as_object()) {
        Some(obj) => obj,
        None => return vec![],
    };

    servers_obj
        .iter()
        .map(|(name, config)| parse_mcp_server(name, config))
        .collect()
}

/// Parse a single MCP server entry from JSON.
fn parse_mcp_server(name: &str, config: &serde_json::Value) -> McpServer {
    let command = config.get("command").and_then(|v| v.as_str()).map(String::from);
    let args = config
        .get("args")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        });
    let url = config.get("url").and_then(|v| v.as_str()).map(String::from);
    let server_type = config
        .get("type")
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            if url.is_some() {
                Some("http".to_string())
            } else if command.is_some() {
                Some("stdio".to_string())
            } else {
                None
            }
        });
    let env = config
        .get("env")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect()
        })
        .unwrap_or_default();

    McpServer {
        name: name.to_string(),
        command,
        args,
        server_type,
        url,
        env,
    }
}

/// Extract a string array from a settings map.
fn extract_string_array(
    settings: &HashMap<String, serde_json::Value>,
    key: &str,
) -> Vec<String> {
    settings
        .get(key)
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

/// Extract hooks from a settings map.
fn extract_hooks(settings: &HashMap<String, serde_json::Value>) -> Vec<Hook> {
    let hooks_val = match settings.get("hooks") {
        Some(v) => v,
        None => return vec![],
    };

    let hooks_obj = match hooks_val.as_object() {
        Some(obj) => obj,
        None => return vec![],
    };

    let mut result = Vec::new();

    for (event, entries) in hooks_obj {
        let entries_arr = match entries.as_array() {
            Some(arr) => arr,
            None => continue,
        };

        for entry in entries_arr {
            let matcher = entry
                .get("matcher")
                .and_then(|v| v.as_str())
                .unwrap_or("*")
                .to_string();

            let inner_hooks = match entry.get("hooks").and_then(|v| v.as_array()) {
                Some(arr) => arr,
                None => continue,
            };

            for hook in inner_hooks {
                let hook_type = hook
                    .get("type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("command")
                    .to_string();
                let command = hook
                    .get("command")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                result.push(Hook {
                    event: event.clone(),
                    matcher: matcher.clone(),
                    hook_type,
                    command,
                });
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn make_test_server(name: &str) -> McpServer {
        McpServer {
            name: name.to_string(),
            command: Some("npx".to_string()),
            args: Some(vec!["-y".to_string(), format!("{}-package", name)]),
            server_type: Some("stdio".to_string()),
            url: None,
            env: {
                let mut env = HashMap::new();
                env.insert("API_KEY".to_string(), "test-key-123".to_string());
                env
            },
        }
    }

    #[test]
    fn test_install_mcp_creates_file_if_missing() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        // File doesn't exist yet
        assert!(!config_path.exists());

        install_mcp_to_project_at("/test/project", make_test_server("test-mcp"), &config_path)
            .unwrap();

        // File should now exist with correct structure
        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        let server = &parsed["projects"]["/test/project"]["mcpServers"]["test-mcp"];
        assert_eq!(server["command"], "npx");
        assert_eq!(server["args"][0], "-y");
        assert_eq!(server["args"][1], "test-mcp-package");
        assert_eq!(server["env"]["API_KEY"], "test-key-123");
        assert_eq!(server["type"], "stdio");
    }

    #[test]
    fn test_install_mcp_preserves_existing_data() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        // Write a config file with existing data
        let existing = serde_json::json!({
            "numStartups": 42,
            "autoUpdates": true,
            "mcpServers": {
                "global-mcp": {
                    "type": "stdio",
                    "command": "npx",
                    "args": ["-y", "global-package"]
                }
            },
            "projects": {
                "/existing/project": {
                    "mcpServers": {
                        "existing-mcp": {
                            "command": "node",
                            "args": ["server.js"]
                        }
                    },
                    "allowedTools": ["Bash", "Read"]
                }
            }
        });
        std::fs::write(&config_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

        // Install a new MCP to a DIFFERENT project
        install_mcp_to_project_at("/new/project", make_test_server("new-mcp"), &config_path)
            .unwrap();

        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        // Existing top-level data preserved
        assert_eq!(parsed["numStartups"], 42);
        assert_eq!(parsed["autoUpdates"], true);
        assert_eq!(parsed["mcpServers"]["global-mcp"]["command"], "npx");

        // Existing project preserved
        assert_eq!(
            parsed["projects"]["/existing/project"]["mcpServers"]["existing-mcp"]["command"],
            "node"
        );
        assert_eq!(
            parsed["projects"]["/existing/project"]["allowedTools"][0],
            "Bash"
        );

        // New project added
        assert_eq!(
            parsed["projects"]["/new/project"]["mcpServers"]["new-mcp"]["command"],
            "npx"
        );
    }

    #[test]
    fn test_install_mcp_preserves_existing_project_mcps() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        let existing = serde_json::json!({
            "projects": {
                "/my/project": {
                    "mcpServers": {
                        "mcp-a": { "command": "cmd-a", "args": ["arg-a"] },
                        "mcp-b": { "command": "cmd-b", "args": ["arg-b"] }
                    }
                }
            }
        });
        std::fs::write(&config_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

        // Install a third MCP to the same project
        install_mcp_to_project_at("/my/project", make_test_server("mcp-c"), &config_path)
            .unwrap();

        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        // All three MCPs should exist
        let mcps = &parsed["projects"]["/my/project"]["mcpServers"];
        assert_eq!(mcps["mcp-a"]["command"], "cmd-a");
        assert_eq!(mcps["mcp-b"]["command"], "cmd-b");
        assert_eq!(mcps["mcp-c"]["command"], "npx");
    }

    #[test]
    fn test_install_mcp_updates_existing_server() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        let existing = serde_json::json!({
            "projects": {
                "/my/project": {
                    "mcpServers": {
                        "my-mcp": { "command": "old-cmd", "args": ["old-arg"] }
                    }
                }
            }
        });
        std::fs::write(&config_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

        // Update the same server
        install_mcp_to_project_at("/my/project", make_test_server("my-mcp"), &config_path)
            .unwrap();

        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        // Server should be updated, not duplicated
        let server = &parsed["projects"]["/my/project"]["mcpServers"]["my-mcp"];
        assert_eq!(server["command"], "npx"); // updated
        assert_eq!(server["args"][1], "my-mcp-package"); // updated
    }

    #[test]
    fn test_install_mcp_preserves_other_project_fields() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        let existing = serde_json::json!({
            "projects": {
                "/my/project": {
                    "mcpServers": {},
                    "allowedTools": ["Bash", "Read"],
                    "customSettings": { "key": "value" },
                    "history": [1, 2, 3]
                }
            }
        });
        std::fs::write(&config_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

        install_mcp_to_project_at("/my/project", make_test_server("new-mcp"), &config_path)
            .unwrap();

        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        let project = &parsed["projects"]["/my/project"];
        assert_eq!(project["allowedTools"][0], "Bash");
        assert_eq!(project["allowedTools"][1], "Read");
        assert_eq!(project["customSettings"]["key"], "value");
        assert_eq!(project["history"][2], 3);
        assert_eq!(project["mcpServers"]["new-mcp"]["command"], "npx");
    }

    #[test]
    fn test_install_mcp_http_server() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        let server = McpServer {
            name: "linear-server".to_string(),
            command: None,
            args: None,
            server_type: Some("http".to_string()),
            url: Some("https://mcp.linear.app/mcp".to_string()),
            env: HashMap::new(),
        };

        install_mcp_to_project_at("/my/project", server, &config_path).unwrap();

        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        let server = &parsed["projects"]["/my/project"]["mcpServers"]["linear-server"];
        assert_eq!(server["type"], "http");
        assert_eq!(server["url"], "https://mcp.linear.app/mcp");
        assert!(server.get("command").is_none());
        assert!(server.get("env").is_none());
    }

    #[test]
    fn test_install_mcp_output_is_valid_json() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        // Start with a realistic config
        let existing = serde_json::json!({
            "numStartups": 100,
            "mcpServers": { "global": { "command": "test" } },
            "projects": {}
        });
        std::fs::write(&config_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

        // Install multiple MCPs
        for i in 0..5 {
            install_mcp_to_project_at(
                &format!("/project/{}", i),
                make_test_server(&format!("mcp-{}", i)),
                &config_path,
            )
            .unwrap();
        }

        // Verify the output is valid JSON
        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: Result<serde_json::Value, _> = serde_json::from_str(&content);
        assert!(parsed.is_ok(), "Output must be valid JSON");

        let parsed = parsed.unwrap();
        assert_eq!(parsed["numStartups"], 100);
        assert_eq!(parsed["mcpServers"]["global"]["command"], "test");

        for i in 0..5 {
            assert!(
                parsed["projects"][format!("/project/{}", i)]["mcpServers"]
                    [format!("mcp-{}", i)]
                    .is_object(),
                "MCP {} should exist",
                i
            );
        }
    }

    #[test]
    fn test_install_mcp_globally_creates_entry() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        let existing = serde_json::json!({ "numStartups": 10 });
        std::fs::write(&config_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

        install_mcp_globally_at(make_test_server("my-global-mcp"), &config_path).unwrap();

        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        assert_eq!(parsed["numStartups"], 10);
        assert_eq!(parsed["mcpServers"]["my-global-mcp"]["command"], "npx");
        assert_eq!(parsed["mcpServers"]["my-global-mcp"]["type"], "stdio");
        assert_eq!(parsed["mcpServers"]["my-global-mcp"]["env"]["API_KEY"], "test-key-123");
    }

    #[test]
    fn test_install_mcp_globally_preserves_existing_global_mcps() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        let existing = serde_json::json!({
            "mcpServers": {
                "existing-global": { "type": "stdio", "command": "existing-cmd" }
            }
        });
        std::fs::write(&config_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

        install_mcp_globally_at(make_test_server("new-global"), &config_path).unwrap();

        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        assert_eq!(parsed["mcpServers"]["existing-global"]["command"], "existing-cmd");
        assert_eq!(parsed["mcpServers"]["new-global"]["command"], "npx");
    }

    #[test]
    fn test_install_mcp_globally_preserves_projects() {
        let tmp = tempfile::tempdir().unwrap();
        let config_path = tmp.path().join(".claude.json");

        let existing = serde_json::json!({
            "mcpServers": {},
            "projects": {
                "/my/project": {
                    "mcpServers": { "proj-mcp": { "command": "test" } },
                    "allowedTools": ["Bash"]
                }
            }
        });
        std::fs::write(&config_path, serde_json::to_string_pretty(&existing).unwrap()).unwrap();

        install_mcp_globally_at(make_test_server("global-mcp"), &config_path).unwrap();

        let content = std::fs::read_to_string(&config_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

        assert_eq!(parsed["projects"]["/my/project"]["mcpServers"]["proj-mcp"]["command"], "test");
        assert_eq!(parsed["projects"]["/my/project"]["allowedTools"][0], "Bash");
        assert_eq!(parsed["mcpServers"]["global-mcp"]["command"], "npx");
    }
}
