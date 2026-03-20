use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum PromptType {
    SystemPrompt,
    Skill,
    Template,
    Snippet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariableDefinition {
    pub default: Option<String>,
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptMeta {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub prompt_type: PromptType,
    #[serde(default)]
    pub target: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_version")]
    pub version: u32,
    pub created: String,
    pub modified: String,
    #[serde(default)]
    pub variables: HashMap<String, VariableDefinition>,
    #[serde(default)]
    pub composable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub insert_point: Option<String>,
}

fn default_version() -> u32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prompt {
    pub meta: PromptMeta,
    pub body: String,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptSummary {
    pub id: String,
    pub title: String,
    pub prompt_type: PromptType,
    pub target: Vec<String>,
    pub tags: Vec<String>,
    pub modified: String,
    pub file_path: String,
}

/// Map an insert_point value to a sort order for composing prompts.
///
/// - "system" -> 0
/// - "context" -> 1
/// - "task" -> 2
/// - "rules" -> 3
/// - "output-format" -> 4
/// - None or unknown -> 5
pub fn insert_point_order(ip: &Option<String>) -> u8 {
    match ip.as_deref() {
        Some("system") => 0,
        Some("context") => 1,
        Some("task") => 2,
        Some("rules") => 3,
        Some("output-format") => 4,
        _ => 5,
    }
}

impl From<&Prompt> for PromptSummary {
    fn from(p: &Prompt) -> Self {
        Self {
            id: p.meta.id.clone(),
            title: p.meta.title.clone(),
            prompt_type: p.meta.prompt_type.clone(),
            target: p.meta.target.clone(),
            tags: p.meta.tags.clone(),
            modified: p.meta.modified.clone(),
            file_path: p.file_path.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insert_point_order_system() {
        assert_eq!(insert_point_order(&Some("system".to_string())), 0);
    }

    #[test]
    fn test_insert_point_order_context() {
        assert_eq!(insert_point_order(&Some("context".to_string())), 1);
    }

    #[test]
    fn test_insert_point_order_task() {
        assert_eq!(insert_point_order(&Some("task".to_string())), 2);
    }

    #[test]
    fn test_insert_point_order_rules() {
        assert_eq!(insert_point_order(&Some("rules".to_string())), 3);
    }

    #[test]
    fn test_insert_point_order_output_format() {
        assert_eq!(insert_point_order(&Some("output-format".to_string())), 4);
    }

    #[test]
    fn test_insert_point_order_none() {
        assert_eq!(insert_point_order(&None), 5);
    }

    #[test]
    fn test_insert_point_order_unknown() {
        assert_eq!(insert_point_order(&Some("banana".to_string())), 5);
    }

    #[test]
    fn test_insert_point_order_sorting() {
        // Verify that sorting by insert_point_order produces correct ordering
        let mut points = vec![
            Some("output-format".to_string()),
            None,
            Some("system".to_string()),
            Some("task".to_string()),
            Some("context".to_string()),
            Some("rules".to_string()),
        ];
        points.sort_by_key(|ip| insert_point_order(ip));
        assert_eq!(points[0], Some("system".to_string()));
        assert_eq!(points[1], Some("context".to_string()));
        assert_eq!(points[2], Some("task".to_string()));
        assert_eq!(points[3], Some("rules".to_string()));
        assert_eq!(points[4], Some("output-format".to_string()));
        assert_eq!(points[5], None);
    }
}
