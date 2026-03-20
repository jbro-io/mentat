use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use tauri::State;

use crate::error::AppError;
use crate::models::prompt::{Prompt, PromptMeta, PromptType, VariableDefinition};
use crate::staging;
use crate::store::file_store::FileStore;

/// Resolve `{{variable}}` placeholders in a prompt body.
///
/// Returns the body with all matching placeholders replaced by their values.
/// Unresolved placeholders are left as-is.
#[tauri::command]
pub fn resolve_prompt(
    body: String,
    variable_values: HashMap<String, String>,
) -> Result<String, AppError> {
    Ok(staging::resolve_variables(&body, &variable_values))
}

/// Export a resolved prompt to an arbitrary file path.
///
/// Unlike other file operations, this is NOT restricted to the prompts directory.
/// It writes the resolved text to whatever path the user specifies.
#[tauri::command]
pub fn export_prompt(resolved_text: String, output_path: String) -> Result<(), AppError> {
    let path = std::path::Path::new(&output_path);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }

    std::fs::write(path, &resolved_text)?;
    Ok(())
}

/// Pure compose logic, independent of Tauri state — takes a list of prompts
/// and returns a synthetic composed prompt.
///
/// - Sorts by insert_point order
/// - Concatenates bodies with `\n\n---\n\n`
/// - Merges tags, targets, variables (first definition wins)
pub fn compose_prompt_list(prompts: Vec<Prompt>) -> Result<Prompt, AppError> {
    if prompts.is_empty() {
        return Err(AppError::Parse("No prompts to compose".to_string()));
    }

    // Sort by insert_point order
    let mut prompts = prompts;
    prompts.sort_by_key(|p| crate::models::prompt::insert_point_order(&p.meta.insert_point));

    // Merge bodies
    let bodies: Vec<&str> = prompts.iter().map(|p| p.body.as_str()).collect();
    let merged_body = bodies.join("\n\n---\n\n");

    // Merge tags (deduplicated, preserving order)
    let mut merged_tags = Vec::new();
    for p in &prompts {
        for tag in &p.meta.tags {
            if !merged_tags.contains(tag) {
                merged_tags.push(tag.clone());
            }
        }
    }

    // Merge targets (deduplicated, preserving order)
    let mut merged_targets = Vec::new();
    for p in &prompts {
        for target in &p.meta.target {
            if !merged_targets.contains(target) {
                merged_targets.push(target.clone());
            }
        }
    }

    // Merge variables (first definition wins)
    let mut merged_variables: HashMap<String, VariableDefinition> = HashMap::new();
    for p in &prompts {
        for (name, def) in &p.meta.variables {
            if !merged_variables.contains_key(name) {
                merged_variables.insert(name.clone(), def.clone());
            }
        }
    }

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    Ok(Prompt {
        meta: PromptMeta {
            id: uuid::Uuid::new_v4().to_string(),
            title: "Composed Prompt".to_string(),
            prompt_type: PromptType::SystemPrompt,
            target: merged_targets,
            tags: merged_tags,
            version: 1,
            created: today.clone(),
            modified: today,
            variables: merged_variables,
            composable: false,
            insert_point: None,
        },
        body: merged_body,
        file_path: String::new(),
    })
}

/// Compose multiple prompts into a single synthetic prompt.
///
/// Reads each prompt from the store by file_path, then delegates to `compose_prompt_list`.
#[tauri::command]
pub fn compose_prompts(
    store: State<'_, Arc<Mutex<FileStore>>>,
    file_paths: Vec<String>,
) -> Result<Prompt, AppError> {
    if file_paths.is_empty() {
        return Err(AppError::Parse("No prompts to compose".to_string()));
    }

    let store = store.lock().map_err(|e| AppError::Parse(e.to_string()))?;

    let mut prompts = Vec::new();
    for path in &file_paths {
        let prompt = store.read_prompt(path)?;
        prompts.push(prompt);
    }

    compose_prompt_list(prompts)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::prompt::VariableDefinition;

    fn make_prompt(
        title: &str,
        body: &str,
        insert_point: Option<&str>,
        tags: Vec<&str>,
        targets: Vec<&str>,
        variables: HashMap<String, VariableDefinition>,
    ) -> Prompt {
        Prompt {
            meta: PromptMeta {
                id: uuid::Uuid::new_v4().to_string(),
                title: title.to_string(),
                prompt_type: PromptType::SystemPrompt,
                target: targets.into_iter().map(|s| s.to_string()).collect(),
                tags: tags.into_iter().map(|s| s.to_string()).collect(),
                version: 1,
                created: "2026-01-01".to_string(),
                modified: "2026-01-01".to_string(),
                variables,
                composable: true,
                insert_point: insert_point.map(|s| s.to_string()),
            },
            body: body.to_string(),
            file_path: format!("system-prompts/{}.md", title.to_lowercase().replace(' ', "-")),
        }
    }

    fn simple_prompt(title: &str, body: &str, insert_point: Option<&str>) -> Prompt {
        make_prompt(title, body, insert_point, vec![], vec![], HashMap::new())
    }

    // --- Compose ordering tests ---

    #[test]
    fn test_compose_ordering_correctness() {
        let prompts = vec![
            simple_prompt("Rules", "Follow these rules", Some("rules")),
            simple_prompt("System", "You are a helpful assistant", Some("system")),
            simple_prompt("Task", "Write a function", Some("task")),
            simple_prompt("Context", "Given this codebase", Some("context")),
            simple_prompt("Output", "Return JSON", Some("output-format")),
        ];

        let result = compose_prompt_list(prompts).unwrap();

        // Verify ordering: system, context, task, rules, output-format
        let parts: Vec<&str> = result.body.split("\n\n---\n\n").collect();
        assert_eq!(parts.len(), 5);
        assert_eq!(parts[0], "You are a helpful assistant");
        assert_eq!(parts[1], "Given this codebase");
        assert_eq!(parts[2], "Write a function");
        assert_eq!(parts[3], "Follow these rules");
        assert_eq!(parts[4], "Return JSON");
    }

    #[test]
    fn test_compose_prompts_without_insert_point_go_last() {
        let prompts = vec![
            simple_prompt("No Point", "Unclassified content", None),
            simple_prompt("System", "System prompt", Some("system")),
            simple_prompt("Also No Point", "More content", None),
        ];

        let result = compose_prompt_list(prompts).unwrap();
        let parts: Vec<&str> = result.body.split("\n\n---\n\n").collect();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0], "System prompt");
        // The two None prompts come after, in stable order
    }

    #[test]
    fn test_compose_single_prompt() {
        let prompts = vec![
            simple_prompt("Solo", "Just one prompt body", Some("task")),
        ];

        let result = compose_prompt_list(prompts).unwrap();
        assert_eq!(result.body, "Just one prompt body");
        assert_eq!(result.meta.title, "Composed Prompt");
        assert_eq!(result.meta.prompt_type, PromptType::SystemPrompt);
        assert!(result.file_path.is_empty());
    }

    #[test]
    fn test_compose_empty_list_errors() {
        let result = compose_prompt_list(vec![]);
        assert!(result.is_err());
    }

    // --- Variable merging tests ---

    #[test]
    fn test_compose_variable_merging_first_wins() {
        let mut vars1 = HashMap::new();
        vars1.insert(
            "language".to_string(),
            VariableDefinition {
                default: Some("rust".to_string()),
                description: Some("First definition".to_string()),
                options: None,
            },
        );

        let mut vars2 = HashMap::new();
        vars2.insert(
            "language".to_string(),
            VariableDefinition {
                default: Some("python".to_string()),
                description: Some("Second definition".to_string()),
                options: None,
            },
        );
        vars2.insert(
            "style".to_string(),
            VariableDefinition {
                default: Some("concise".to_string()),
                description: None,
                options: None,
            },
        );

        let prompts = vec![
            make_prompt("P1", "Body1 {{language}}", Some("system"), vec![], vec![], vars1),
            make_prompt("P2", "Body2 {{language}} {{style}}", Some("task"), vec![], vec![], vars2),
        ];

        let result = compose_prompt_list(prompts).unwrap();

        // "language" should use first definition (rust, not python)
        assert_eq!(result.meta.variables.len(), 2);
        let lang = &result.meta.variables["language"];
        assert_eq!(lang.default, Some("rust".to_string()));
        assert_eq!(lang.description, Some("First definition".to_string()));

        // "style" should be included from second prompt
        let style = &result.meta.variables["style"];
        assert_eq!(style.default, Some("concise".to_string()));
    }

    #[test]
    fn test_compose_no_variables() {
        let prompts = vec![
            simple_prompt("A", "Body A", Some("system")),
            simple_prompt("B", "Body B", Some("task")),
        ];

        let result = compose_prompt_list(prompts).unwrap();
        assert!(result.meta.variables.is_empty());
    }

    // --- Tag and target merging tests ---

    #[test]
    fn test_compose_tags_merged_and_deduplicated() {
        let prompts = vec![
            make_prompt("A", "A", Some("system"), vec!["rust", "coding"], vec![], HashMap::new()),
            make_prompt("B", "B", Some("task"), vec!["coding", "review"], vec![], HashMap::new()),
        ];

        let result = compose_prompt_list(prompts).unwrap();
        // Should be deduplicated: rust, coding, review (order from first occurrences after sort)
        assert_eq!(result.meta.tags.len(), 3);
        assert!(result.meta.tags.contains(&"rust".to_string()));
        assert!(result.meta.tags.contains(&"coding".to_string()));
        assert!(result.meta.tags.contains(&"review".to_string()));
    }

    #[test]
    fn test_compose_targets_merged_and_deduplicated() {
        let prompts = vec![
            make_prompt("A", "A", Some("system"), vec![], vec!["claude", "openai"], HashMap::new()),
            make_prompt("B", "B", Some("task"), vec![], vec!["openai", "gemini"], HashMap::new()),
        ];

        let result = compose_prompt_list(prompts).unwrap();
        assert_eq!(result.meta.target.len(), 3);
        assert!(result.meta.target.contains(&"claude".to_string()));
        assert!(result.meta.target.contains(&"openai".to_string()));
        assert!(result.meta.target.contains(&"gemini".to_string()));
    }

    // --- Synthetic prompt metadata tests ---

    #[test]
    fn test_compose_result_metadata() {
        let prompts = vec![
            simple_prompt("A", "Body A", Some("system")),
        ];

        let result = compose_prompt_list(prompts).unwrap();

        // UUID should be valid
        assert!(uuid::Uuid::parse_str(&result.meta.id).is_ok());
        assert_eq!(result.meta.title, "Composed Prompt");
        assert_eq!(result.meta.prompt_type, PromptType::SystemPrompt);
        assert!(result.file_path.is_empty());
        assert_eq!(result.meta.version, 1);
        assert!(!result.meta.composable);
        assert!(result.meta.insert_point.is_none());
    }

    // --- Export tests ---

    #[test]
    fn test_export_prompt_writes_file() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("output.txt");
        let text = "Resolved prompt content here.";

        export_prompt(text.to_string(), path.to_string_lossy().to_string()).unwrap();

        let contents = std::fs::read_to_string(&path).unwrap();
        assert_eq!(contents, text);
    }

    #[test]
    fn test_export_prompt_creates_parent_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("a/b/c/output.md");

        export_prompt(
            "nested content".to_string(),
            path.to_string_lossy().to_string(),
        )
        .unwrap();

        let contents = std::fs::read_to_string(&path).unwrap();
        assert_eq!(contents, "nested content");
    }
}
