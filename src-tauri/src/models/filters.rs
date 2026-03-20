use serde::{Deserialize, Serialize};
use super::prompt::PromptType;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PromptFilter {
    pub tags: Option<Vec<String>>,
    pub prompt_type: Option<PromptType>,
    pub target: Option<String>,
    pub folder: Option<String>,
}
