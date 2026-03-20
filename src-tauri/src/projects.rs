use std::path::Path;

use crate::error::AppError;
use crate::models::project::{ProjectConfig, ProjectSummary};

/// Scan the `projects/` directory for subdirectories containing `.project.yaml`.
pub fn list_projects(base_path: &Path) -> Result<Vec<ProjectSummary>, AppError> {
    let projects_dir = base_path.join("projects");
    if !projects_dir.exists() {
        return Ok(vec![]);
    }

    let mut summaries = Vec::new();

    for entry in std::fs::read_dir(&projects_dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let config_path = path.join(".project.yaml");
        if !config_path.exists() {
            continue;
        }

        match read_project_config(&config_path) {
            Ok(config) => {
                let dir_name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                summaries.push(ProjectSummary {
                    name: config.name,
                    description: config.description,
                    path: dir_name,
                });
            }
            Err(e) => {
                eprintln!(
                    "Warning: skipping project at {}: {}",
                    path.display(),
                    e
                );
            }
        }
    }

    summaries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(summaries)
}

/// Read and parse a single project's config from its `.project.yaml` file.
pub fn get_project(base_path: &Path, name: &str) -> Result<ProjectConfig, AppError> {
    // Reject path traversal
    if name.contains("..") || name.contains('/') || name.contains('\\') {
        return Err(AppError::InvalidPath(
            "Invalid project name".to_string(),
        ));
    }

    let config_path = base_path.join("projects").join(name).join(".project.yaml");
    if !config_path.exists() {
        return Err(AppError::NotFound(format!(
            "Project not found: {}",
            name
        )));
    }

    read_project_config(&config_path)
}

fn read_project_config(path: &Path) -> Result<ProjectConfig, AppError> {
    let content = std::fs::read_to_string(path)?;
    let config: ProjectConfig = serde_yaml::from_str(&content)?;
    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_list_projects_empty() {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(tmp.path().join("projects")).unwrap();
        let result = list_projects(tmp.path()).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_list_projects_finds_projects() {
        let tmp = tempfile::tempdir().unwrap();
        let project_dir = tmp.path().join("projects/my-project");
        std::fs::create_dir_all(&project_dir).unwrap();

        let config = ProjectConfig {
            name: "My Project".to_string(),
            description: Some("A test project".to_string()),
            defaults: HashMap::new(),
        };
        let yaml = serde_yaml::to_string(&config).unwrap();
        std::fs::write(project_dir.join(".project.yaml"), &yaml).unwrap();

        let result = list_projects(tmp.path()).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "My Project");
        assert_eq!(result[0].description, Some("A test project".to_string()));
        assert_eq!(result[0].path, "my-project");
    }

    #[test]
    fn test_list_projects_skips_dirs_without_config() {
        let tmp = tempfile::tempdir().unwrap();
        let project_dir = tmp.path().join("projects/no-config");
        std::fs::create_dir_all(&project_dir).unwrap();

        let result = list_projects(tmp.path()).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_get_project() {
        let tmp = tempfile::tempdir().unwrap();
        let project_dir = tmp.path().join("projects/test-proj");
        std::fs::create_dir_all(&project_dir).unwrap();

        let mut defaults = HashMap::new();
        defaults.insert("language".to_string(), "rust".to_string());

        let config = ProjectConfig {
            name: "Test Proj".to_string(),
            description: None,
            defaults,
        };
        let yaml = serde_yaml::to_string(&config).unwrap();
        std::fs::write(project_dir.join(".project.yaml"), &yaml).unwrap();

        let result = get_project(tmp.path(), "test-proj").unwrap();
        assert_eq!(result.name, "Test Proj");
        assert_eq!(result.defaults.get("language").unwrap(), "rust");
    }

    #[test]
    fn test_get_project_not_found() {
        let tmp = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(tmp.path().join("projects")).unwrap();
        let result = get_project(tmp.path(), "nonexistent");
        assert!(result.is_err());
    }

    #[test]
    fn test_get_project_rejects_traversal() {
        let tmp = tempfile::tempdir().unwrap();
        let result = get_project(tmp.path(), "../etc");
        assert!(result.is_err());
    }
}
