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
