use std::path::PathBuf;
use walkdir::WalkDir;

use crate::error::AppError;
use crate::models::filters::PromptFilter;
use crate::models::prompt::{Prompt, PromptSummary, PromptType};
use crate::store::frontmatter;

pub struct FileStore {
    pub base_path: PathBuf,
}

impl FileStore {
    pub fn new() -> Result<Self, AppError> {
        let home = dirs::home_dir()
            .ok_or_else(|| AppError::InvalidPath("Cannot find home directory".into()))?;
        Ok(Self {
            base_path: home.join(".mentat"),
        })
    }

    pub fn init(&self) -> Result<(), AppError> {
        let dirs = [
            self.base_path.join("prompts/system-prompts"),
            self.base_path.join("prompts/skills/claude"),
            self.base_path.join("prompts/skills/openai"),
            self.base_path.join("prompts/snippets"),
            self.base_path.join("prompts/templates"),
            self.base_path.join("projects"),
            self.base_path.join("scratches"),
            self.base_path.join(".mentat"),
        ];
        for dir in &dirs {
            std::fs::create_dir_all(dir)?;
        }

        // Create .gitignore if it doesn't exist
        let gitignore_path = self.base_path.join(".gitignore");
        if !gitignore_path.exists() {
            std::fs::write(
                &gitignore_path,
                ".mentat/index.sqlite\n.mentat/dispatch-log.jsonl\n",
            )?;
        }

        Ok(())
    }

    fn prompts_path(&self) -> PathBuf {
        self.base_path.join("prompts")
    }

    /// Validate and sanitize a relative path to prevent path traversal attacks.
    ///
    /// Rejects paths that:
    /// - Contain `..` segments
    /// - Are absolute paths
    /// - Contain null bytes
    /// - Resolve outside the prompts directory
    fn sanitize_path(&self, relative_path: &str) -> Result<PathBuf, AppError> {
        // Reject null bytes
        if relative_path.contains('\0') {
            return Err(AppError::InvalidPath(
                "Path contains null bytes".to_string(),
            ));
        }

        // Reject absolute paths
        if relative_path.starts_with('/') || relative_path.starts_with('\\') {
            return Err(AppError::InvalidPath(
                "Absolute paths are not allowed".to_string(),
            ));
        }

        // Reject path traversal components
        for component in std::path::Path::new(relative_path).components() {
            match component {
                std::path::Component::ParentDir => {
                    return Err(AppError::InvalidPath(
                        "Path traversal (..) is not allowed".to_string(),
                    ));
                }
                std::path::Component::RootDir | std::path::Component::Prefix(_) => {
                    return Err(AppError::InvalidPath(
                        "Absolute paths are not allowed".to_string(),
                    ));
                }
                _ => {}
            }
        }

        let full_path = self.prompts_path().join(relative_path);

        // Canonicalize parent to verify the path stays within prompts dir.
        // We check the parent because the file itself may not exist yet (for writes).
        let prompts_canonical = self.prompts_path().canonicalize().unwrap_or_else(|_| self.prompts_path().clone());

        if let Some(parent) = full_path.parent() {
            if parent.exists() {
                let parent_canonical = parent
                    .canonicalize()
                    .map_err(|_| AppError::InvalidPath(format!("Cannot resolve path: {}", relative_path)))?;
                if !parent_canonical.starts_with(&prompts_canonical) {
                    return Err(AppError::InvalidPath(
                        "Path resolves outside the prompts directory".to_string(),
                    ));
                }
            }
        }

        Ok(full_path)
    }

    /// Derive a file_path from the prompt type and title.
    ///
    /// Maps prompt types to directories:
    /// - SystemPrompt -> system-prompts/
    /// - Skill -> skills/
    /// - Template -> templates/
    /// - Snippet -> snippets/
    pub fn derive_file_path(prompt_type: &PromptType, title: &str) -> String {
        let dir = match prompt_type {
            PromptType::SystemPrompt => "system-prompts",
            PromptType::Skill => "skills",
            PromptType::Template => "templates",
            PromptType::Snippet => "snippets",
        };
        let slug = frontmatter::slugify(title);
        format!("{}/{}.md", dir, slug)
    }

    /// Get today's date as a string in YYYY-MM-DD format.
    fn today() -> String {
        chrono::Local::now().format("%Y-%m-%d").to_string()
    }

    pub fn list_files(&self) -> Result<Vec<PathBuf>, AppError> {
        let prompts_dir = self.prompts_path();
        if !prompts_dir.exists() {
            return Ok(vec![]);
        }
        let mut files = Vec::new();
        for entry in WalkDir::new(&prompts_dir).follow_links(false) {
            let entry = entry.map_err(|e| AppError::Io(e.into()))?;
            if entry.file_type().is_file()
                && entry
                    .path()
                    .extension()
                    .is_some_and(|ext| ext == "md")
            {
                files.push(entry.into_path());
            }
        }
        Ok(files)
    }

    pub fn read_prompt(&self, relative_path: &str) -> Result<Prompt, AppError> {
        let full_path = self.sanitize_path(relative_path)?;
        if !full_path.exists() {
            return Err(AppError::NotFound(format!(
                "Prompt not found: {}",
                relative_path
            )));
        }
        let content = std::fs::read_to_string(&full_path)?;
        frontmatter::parse_prompt(&content, relative_path)
    }

    /// Write a prompt to disk.
    ///
    /// Automatically sets the `modified` date to today.
    pub fn write_prompt(&self, prompt: &Prompt) -> Result<(), AppError> {
        let full_path = self.sanitize_path(&prompt.file_path)?;
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Auto-update modified date
        let mut prompt = prompt.clone();
        prompt.meta.modified = Self::today();

        let content = frontmatter::serialize_prompt(&prompt)?;
        std::fs::write(&full_path, content)?;
        Ok(())
    }

    /// Create a new prompt with auto-generated defaults.
    ///
    /// - Generates a UUID if `id` is empty
    /// - Sets `created` and `modified` to today
    /// - Derives `file_path` from type + slugified title if `file_path` is empty
    pub fn create_prompt(&self, prompt: &Prompt) -> Result<Prompt, AppError> {
        let mut prompt = prompt.clone();

        // Auto-generate UUID if not provided
        if prompt.meta.id.is_empty() {
            prompt.meta.id = uuid::Uuid::new_v4().to_string();
        }

        // Set created/modified dates
        let today = Self::today();
        if prompt.meta.created.is_empty() {
            prompt.meta.created = today.clone();
        }
        prompt.meta.modified = today;

        // Auto-derive file_path if not provided
        if prompt.file_path.is_empty() {
            prompt.file_path =
                Self::derive_file_path(&prompt.meta.prompt_type, &prompt.meta.title);
        }

        // Validate and write
        let full_path = self.sanitize_path(&prompt.file_path)?;

        // Prevent silently overwriting an existing prompt
        if full_path.exists() {
            return Err(AppError::InvalidPath(format!(
                "A prompt already exists at: {}",
                prompt.file_path
            )));
        }

        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = frontmatter::serialize_prompt(&prompt)?;
        std::fs::write(&full_path, content)?;

        Ok(prompt)
    }

    pub fn delete_prompt(&self, relative_path: &str) -> Result<(), AppError> {
        let full_path = self.sanitize_path(relative_path)?;
        if !full_path.exists() {
            return Err(AppError::NotFound(format!(
                "Prompt not found: {}",
                relative_path
            )));
        }
        std::fs::remove_file(&full_path)?;
        // Clean up empty parent directories
        if let Some(parent) = full_path.parent() {
            let _ = Self::remove_empty_parents(parent, &self.prompts_path());
        }
        Ok(())
    }

    fn remove_empty_parents(
        dir: &std::path::Path,
        stop_at: &std::path::Path,
    ) -> Result<(), AppError> {
        if dir == stop_at || !dir.starts_with(stop_at) {
            return Ok(());
        }
        if dir.read_dir()?.next().is_none() {
            std::fs::remove_dir(dir)?;
            if let Some(parent) = dir.parent() {
                Self::remove_empty_parents(parent, stop_at)?;
            }
        }
        Ok(())
    }

    pub fn list_all_prompts(&self) -> Result<Vec<Prompt>, AppError> {
        let files = self.list_files()?;
        let prompts_dir = self.prompts_path();
        let mut prompts = Vec::new();
        for file in files {
            let relative = file
                .strip_prefix(&prompts_dir)
                .map_err(|_| AppError::InvalidPath(file.display().to_string()))?
                .to_string_lossy()
                .to_string();
            match self.read_prompt(&relative) {
                Ok(prompt) => prompts.push(prompt),
                Err(e) => eprintln!("Warning: skipping {}: {}", relative, e),
            }
        }
        Ok(prompts)
    }

    pub fn list_prompt_summaries(
        &self,
        filter: Option<PromptFilter>,
    ) -> Result<Vec<PromptSummary>, AppError> {
        let prompts = self.list_all_prompts()?;
        let summaries: Vec<PromptSummary> = prompts
            .iter()
            .filter(|p| {
                if let Some(ref f) = filter {
                    if let Some(ref tags) = f.tags {
                        if !tags.iter().any(|t| p.meta.tags.contains(t)) {
                            return false;
                        }
                    }
                    if let Some(ref pt) = f.prompt_type {
                        if &p.meta.prompt_type != pt {
                            return false;
                        }
                    }
                    if let Some(ref target) = f.target {
                        if !p.meta.target.contains(target) {
                            return false;
                        }
                    }
                    if let Some(ref folder) = f.folder {
                        if !p.file_path.starts_with(folder) {
                            return false;
                        }
                    }
                }
                true
            })
            .map(PromptSummary::from)
            .collect();
        Ok(summaries)
    }

    pub fn list_folders(&self) -> Result<Vec<String>, AppError> {
        let prompts_dir = self.prompts_path();
        if !prompts_dir.exists() {
            return Ok(vec![]);
        }
        let mut folders = Vec::new();
        for entry in WalkDir::new(&prompts_dir).follow_links(false) {
            let entry = entry.map_err(|e| AppError::Io(e.into()))?;
            if entry.file_type().is_dir() && entry.path() != prompts_dir {
                let relative = entry
                    .path()
                    .strip_prefix(&prompts_dir)
                    .map_err(|_| AppError::InvalidPath(entry.path().display().to_string()))?
                    .to_string_lossy()
                    .to_string();
                folders.push(relative);
            }
        }
        folders.sort();
        Ok(folders)
    }

    pub fn list_all_tags(&self) -> Result<Vec<String>, AppError> {
        let prompts = self.list_all_prompts()?;
        let mut tags: Vec<String> = prompts
            .iter()
            .flat_map(|p| p.meta.tags.clone())
            .collect();
        tags.sort();
        tags.dedup();
        Ok(tags)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_rejects_path_traversal() {
        let store = FileStore {
            base_path: PathBuf::from("/tmp/mentat-test"),
        };
        assert!(store.sanitize_path("../../etc/passwd").is_err());
        assert!(store.sanitize_path("foo/../../../etc/passwd").is_err());
        assert!(store.sanitize_path("../outside").is_err());
    }

    #[test]
    fn test_sanitize_rejects_absolute_paths() {
        let store = FileStore {
            base_path: PathBuf::from("/tmp/mentat-test"),
        };
        assert!(store.sanitize_path("/etc/passwd").is_err());
    }

    #[test]
    fn test_sanitize_rejects_null_bytes() {
        let store = FileStore {
            base_path: PathBuf::from("/tmp/mentat-test"),
        };
        assert!(store.sanitize_path("foo\0bar.md").is_err());
    }

    #[test]
    fn test_sanitize_allows_valid_paths() {
        let store = FileStore {
            base_path: PathBuf::from("/tmp/mentat-test"),
        };
        // These should pass component validation (even though the dir doesn't exist)
        assert!(store.sanitize_path("system-prompts/test.md").is_ok());
        assert!(store.sanitize_path("skills/claude/review.md").is_ok());
        assert!(store.sanitize_path("simple.md").is_ok());
    }

    #[test]
    fn test_derive_file_path() {
        assert_eq!(
            FileStore::derive_file_path(&PromptType::SystemPrompt, "My Cool Prompt"),
            "system-prompts/my-cool-prompt.md"
        );
        assert_eq!(
            FileStore::derive_file_path(&PromptType::Skill, "Code Review"),
            "skills/code-review.md"
        );
        assert_eq!(
            FileStore::derive_file_path(&PromptType::Template, "Bug Report"),
            "templates/bug-report.md"
        );
        assert_eq!(
            FileStore::derive_file_path(&PromptType::Snippet, "Git Commands"),
            "snippets/git-commands.md"
        );
    }

    #[test]
    fn test_today_format() {
        let today = FileStore::today();
        // Should match YYYY-MM-DD format
        assert_eq!(today.len(), 10);
        assert_eq!(today.chars().nth(4), Some('-'));
        assert_eq!(today.chars().nth(7), Some('-'));
    }

    // --- Integration-style tests using temp directories ---

    use crate::models::prompt::{Prompt, PromptMeta, PromptType, VariableDefinition};
    use crate::models::filters::PromptFilter;
    use std::collections::HashMap;

    fn make_test_store() -> (FileStore, tempfile::TempDir) {
        let tmp = tempfile::tempdir().expect("Failed to create temp dir");
        let store = FileStore {
            base_path: tmp.path().to_path_buf(),
        };
        store.init().expect("Failed to init store");
        (store, tmp)
    }

    fn make_test_prompt(title: &str, prompt_type: PromptType) -> Prompt {
        Prompt {
            meta: PromptMeta {
                id: String::new(),
                title: title.to_string(),
                prompt_type,
                target: vec!["claude".to_string()],
                tags: vec!["test".to_string()],
                version: 1,
                created: String::new(),
                modified: String::new(),
                variables: HashMap::new(),
                composable: false,
                insert_point: None,
            },
            body: format!("Body for {}", title),
            file_path: String::new(),
        }
    }

    #[test]
    fn test_create_and_read_prompt() {
        let (store, _tmp) = make_test_store();
        let prompt = make_test_prompt("Create Read Test", PromptType::Snippet);

        let created = store.create_prompt(&prompt).unwrap();
        assert!(!created.meta.id.is_empty());
        assert!(!created.file_path.is_empty());

        // Read it back
        let read_back = store.read_prompt(&created.file_path).unwrap();
        assert_eq!(read_back.meta.id, created.meta.id);
        assert_eq!(read_back.meta.title, "Create Read Test");
        assert_eq!(read_back.meta.prompt_type, PromptType::Snippet);
        assert_eq!(read_back.meta.target, vec!["claude".to_string()]);
        assert_eq!(read_back.meta.tags, vec!["test".to_string()]);
        assert!(read_back.body.contains("Body for Create Read Test"));
    }

    #[test]
    fn test_create_auto_generates_uuid_and_dates() {
        let (store, _tmp) = make_test_store();
        let prompt = make_test_prompt("UUID Date Test", PromptType::SystemPrompt);

        let created = store.create_prompt(&prompt).unwrap();

        // Verify id is a valid UUID
        let parsed_uuid = uuid::Uuid::parse_str(&created.meta.id);
        assert!(
            parsed_uuid.is_ok(),
            "ID should be a valid UUID, got: {}",
            created.meta.id
        );

        // Verify created/modified are today
        let today = FileStore::today();
        assert_eq!(created.meta.created, today);
        assert_eq!(created.meta.modified, today);
    }

    #[test]
    fn test_create_preserves_explicit_id_and_created() {
        let (store, _tmp) = make_test_store();
        let mut prompt = make_test_prompt("Explicit ID", PromptType::Snippet);
        prompt.meta.id = "my-explicit-id".to_string();
        prompt.meta.created = "2025-06-15".to_string();

        let created = store.create_prompt(&prompt).unwrap();

        // Explicit id should be preserved
        assert_eq!(created.meta.id, "my-explicit-id");
        // Explicit created date should be preserved
        assert_eq!(created.meta.created, "2025-06-15");
        // Modified should always be set to today
        assert_eq!(created.meta.modified, FileStore::today());
    }

    #[test]
    fn test_write_updates_modified_date() {
        let (store, _tmp) = make_test_store();
        let mut prompt = make_test_prompt("Write Mod Test", PromptType::Skill);
        prompt.meta.created = "2025-01-01".to_string();
        prompt.meta.modified = "2025-01-01".to_string();

        let created = store.create_prompt(&prompt).unwrap();

        // Now modify and write it again
        let mut updated = created.clone();
        updated.body = "Updated body content".to_string();
        store.write_prompt(&updated).unwrap();

        // Read back and verify modified is today
        let read_back = store.read_prompt(&updated.file_path).unwrap();
        assert_eq!(read_back.meta.modified, FileStore::today());
        assert!(read_back.body.contains("Updated body content"));
    }

    #[test]
    fn test_delete_removes_file() {
        let (store, _tmp) = make_test_store();
        let prompt = make_test_prompt("Delete Test", PromptType::Snippet);

        let created = store.create_prompt(&prompt).unwrap();
        let file_path = created.file_path.clone();

        // Verify it exists
        assert!(store.read_prompt(&file_path).is_ok());

        // Delete it
        store.delete_prompt(&file_path).unwrap();

        // Verify it's gone
        assert!(store.read_prompt(&file_path).is_err());

        // Verify list_all_prompts doesn't include it
        let all = store.list_all_prompts().unwrap();
        assert!(
            !all.iter().any(|p| p.meta.id == created.meta.id),
            "Deleted prompt should not appear in list"
        );
    }

    #[test]
    fn test_delete_nonexistent_returns_not_found() {
        let (store, _tmp) = make_test_store();
        let result = store.delete_prompt("snippets/does-not-exist.md");
        assert!(result.is_err());
    }

    #[test]
    fn test_list_all_prompts() {
        let (store, _tmp) = make_test_store();

        // Create several prompts
        store
            .create_prompt(&make_test_prompt("Prompt A", PromptType::Snippet))
            .unwrap();
        store
            .create_prompt(&make_test_prompt("Prompt B", PromptType::Skill))
            .unwrap();
        store
            .create_prompt(&make_test_prompt("Prompt C", PromptType::Template))
            .unwrap();

        let all = store.list_all_prompts().unwrap();
        assert_eq!(all.len(), 3);
    }

    #[test]
    fn test_list_prompt_summaries_no_filter() {
        let (store, _tmp) = make_test_store();

        store
            .create_prompt(&make_test_prompt("Sum A", PromptType::Snippet))
            .unwrap();
        store
            .create_prompt(&make_test_prompt("Sum B", PromptType::Skill))
            .unwrap();

        let summaries = store.list_prompt_summaries(None).unwrap();
        assert_eq!(summaries.len(), 2);
    }

    #[test]
    fn test_list_prompt_summaries_filter_by_type() {
        let (store, _tmp) = make_test_store();

        store
            .create_prompt(&make_test_prompt("Snippet One", PromptType::Snippet))
            .unwrap();
        store
            .create_prompt(&make_test_prompt("Skill One", PromptType::Skill))
            .unwrap();
        store
            .create_prompt(&make_test_prompt("Snippet Two", PromptType::Snippet))
            .unwrap();

        let filter = PromptFilter {
            prompt_type: Some(PromptType::Snippet),
            ..Default::default()
        };
        let summaries = store.list_prompt_summaries(Some(filter)).unwrap();
        assert_eq!(summaries.len(), 2);
        assert!(summaries.iter().all(|s| s.prompt_type == PromptType::Snippet));
    }

    #[test]
    fn test_list_prompt_summaries_filter_by_tags() {
        let (store, _tmp) = make_test_store();

        let mut p1 = make_test_prompt("Tagged A", PromptType::Snippet);
        p1.meta.tags = vec!["rust".to_string(), "coding".to_string()];
        store.create_prompt(&p1).unwrap();

        let mut p2 = make_test_prompt("Tagged B", PromptType::Snippet);
        p2.meta.tags = vec!["python".to_string()];
        store.create_prompt(&p2).unwrap();

        let mut p3 = make_test_prompt("Tagged C", PromptType::Snippet);
        p3.meta.tags = vec!["rust".to_string(), "review".to_string()];
        store.create_prompt(&p3).unwrap();

        let filter = PromptFilter {
            tags: Some(vec!["rust".to_string()]),
            ..Default::default()
        };
        let summaries = store.list_prompt_summaries(Some(filter)).unwrap();
        assert_eq!(summaries.len(), 2);
    }

    #[test]
    fn test_list_prompt_summaries_filter_by_target() {
        let (store, _tmp) = make_test_store();

        let mut p1 = make_test_prompt("Target A", PromptType::Snippet);
        p1.meta.target = vec!["claude".to_string()];
        store.create_prompt(&p1).unwrap();

        let mut p2 = make_test_prompt("Target B", PromptType::Snippet);
        p2.meta.target = vec!["openai".to_string()];
        store.create_prompt(&p2).unwrap();

        let mut p3 = make_test_prompt("Target C", PromptType::Snippet);
        p3.meta.target = vec!["claude".to_string(), "openai".to_string()];
        store.create_prompt(&p3).unwrap();

        let filter = PromptFilter {
            target: Some("openai".to_string()),
            ..Default::default()
        };
        let summaries = store.list_prompt_summaries(Some(filter)).unwrap();
        assert_eq!(summaries.len(), 2);
    }

    #[test]
    fn test_list_prompt_summaries_filter_by_folder() {
        let (store, _tmp) = make_test_store();

        store
            .create_prompt(&make_test_prompt("In Snippets", PromptType::Snippet))
            .unwrap();
        store
            .create_prompt(&make_test_prompt("In Skills", PromptType::Skill))
            .unwrap();

        let filter = PromptFilter {
            folder: Some("snippets".to_string()),
            ..Default::default()
        };
        let summaries = store.list_prompt_summaries(Some(filter)).unwrap();
        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].title, "In Snippets");
    }

    #[test]
    fn test_list_all_tags() {
        let (store, _tmp) = make_test_store();

        let mut p1 = make_test_prompt("Tags A", PromptType::Snippet);
        p1.meta.tags = vec!["alpha".to_string(), "beta".to_string()];
        store.create_prompt(&p1).unwrap();

        let mut p2 = make_test_prompt("Tags B", PromptType::Snippet);
        p2.meta.tags = vec!["beta".to_string(), "gamma".to_string()];
        store.create_prompt(&p2).unwrap();

        let tags = store.list_all_tags().unwrap();
        assert_eq!(tags, vec!["alpha", "beta", "gamma"]);
    }

    #[test]
    fn test_list_folders() {
        let (store, _tmp) = make_test_store();

        // Create prompts in different folders to ensure dirs are populated
        store
            .create_prompt(&make_test_prompt("Folder Snippet", PromptType::Snippet))
            .unwrap();
        store
            .create_prompt(&make_test_prompt("Folder Skill", PromptType::Skill))
            .unwrap();

        let folders = store.list_folders().unwrap();
        // init() creates several directories; we should have at least the ones used
        assert!(!folders.is_empty());
    }

    #[test]
    fn test_create_prompt_with_variables() {
        let (store, _tmp) = make_test_store();
        let mut prompt = make_test_prompt("Vars Prompt", PromptType::Template);
        prompt.meta.variables.insert(
            "language".to_string(),
            VariableDefinition {
                default: Some("rust".to_string()),
                description: Some("Target language".to_string()),
                options: Some(vec!["rust".to_string(), "python".to_string()]),
            },
        );
        prompt.body = "Write {{language}} code.".to_string();

        let created = store.create_prompt(&prompt).unwrap();
        let read_back = store.read_prompt(&created.file_path).unwrap();

        assert_eq!(read_back.meta.variables.len(), 1);
        let var = &read_back.meta.variables["language"];
        assert_eq!(var.default, Some("rust".to_string()));
        assert_eq!(var.options.as_ref().unwrap().len(), 2);
    }
}
