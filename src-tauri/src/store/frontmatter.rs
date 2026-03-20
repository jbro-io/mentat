use crate::error::AppError;
use crate::models::prompt::{Prompt, PromptMeta};

/// Parse a markdown file with YAML frontmatter into a Prompt.
///
/// Handles edge cases:
/// - BOM markers (U+FEFF) at the start of the file
/// - Windows line endings (\r\n)
/// - Trailing whitespace in frontmatter lines
/// - Extra whitespace around the frontmatter block
pub fn parse_prompt(content: &str, file_path: &str) -> Result<Prompt, AppError> {
    // Strip BOM if present
    let content = content.trim_start_matches('\u{feff}');

    // Normalize Windows line endings to Unix
    let content = content.replace("\r\n", "\n");

    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return Err(AppError::Parse(format!(
            "Missing frontmatter in {}",
            file_path
        )));
    }

    // Find the opening delimiter and skip past it
    let after_first_delim = &trimmed[3..];
    // The opening --- may have trailing whitespace before newline
    let after_first_newline = if let Some(nl_pos) = after_first_delim.find('\n') {
        // Verify only whitespace between --- and newline
        let between = &after_first_delim[..nl_pos];
        if !between.trim().is_empty() {
            return Err(AppError::Parse(format!(
                "Invalid frontmatter opening in {}",
                file_path
            )));
        }
        &after_first_delim[nl_pos + 1..]
    } else {
        return Err(AppError::Parse(format!(
            "Unclosed frontmatter in {}",
            file_path
        )));
    };

    // Find the closing --- delimiter: must be on its own line (possibly with trailing whitespace)
    let mut end_pos = None;
    let mut search_start = 0;
    for line in after_first_newline.split('\n') {
        if line.trim() == "---" {
            end_pos = Some(search_start);
            break;
        }
        search_start += line.len() + 1; // +1 for the \n
    }

    let yaml_end = end_pos.ok_or_else(|| {
        AppError::Parse(format!("Unclosed frontmatter in {}", file_path))
    })?;

    let yaml_str = &after_first_newline[..yaml_end];
    // Trim trailing whitespace from each YAML line to avoid parse issues
    let yaml_cleaned: String = yaml_str
        .lines()
        .map(|line| line.trim_end())
        .collect::<Vec<&str>>()
        .join("\n");

    let body_start = yaml_end + after_first_newline[yaml_end..]
        .find('\n')
        .map(|p| p + 1)
        .unwrap_or(after_first_newline.len() - yaml_end);

    let body = if body_start < after_first_newline.len() {
        after_first_newline[body_start..]
            .trim_start_matches('\n')
            .to_string()
    } else {
        String::new()
    };

    let meta: PromptMeta = serde_yaml::from_str(&yaml_cleaned)
        .map_err(|e| AppError::Parse(format!("{}: {}", file_path, e)))?;

    Ok(Prompt {
        meta,
        body,
        file_path: file_path.to_string(),
    })
}

/// Serialize a Prompt back to markdown with YAML frontmatter.
///
/// The output uses Unix line endings and a consistent format:
/// ```text
/// ---
/// <yaml frontmatter>
/// ---
///
/// <body>
/// ```
pub fn serialize_prompt(prompt: &Prompt) -> Result<String, AppError> {
    let yaml = serde_yaml::to_string(&prompt.meta)?;
    Ok(format!("---\n{}---\n\n{}\n", yaml, prompt.body))
}

/// Slugify a title for use in file paths.
///
/// Converts to lowercase, replaces non-alphanumeric characters with hyphens,
/// collapses multiple hyphens, and trims leading/trailing hyphens.
pub fn slugify(title: &str) -> String {
    let slug: String = title
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();

    // Collapse multiple hyphens and trim
    let mut result = String::new();
    let mut prev_hyphen = true; // start true to trim leading hyphens
    for c in slug.chars() {
        if c == '-' {
            if !prev_hyphen {
                result.push('-');
            }
            prev_hyphen = true;
        } else {
            result.push(c);
            prev_hyphen = false;
        }
    }
    // Trim trailing hyphen
    if result.ends_with('-') {
        result.pop();
    }
    if result.is_empty() {
        "untitled".to_string()
    } else {
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::prompt::PromptType;
    use std::collections::HashMap;

    fn make_test_input() -> String {
        r#"---
id: "test-id-123"
title: "Test Prompt"
type: system-prompt
target:
  - claude
tags:
  - test
version: 1
created: "2026-01-15"
modified: "2026-03-18"
variables: {}
composable: false
---

This is the prompt body with {{variable}}.
"#
        .to_string()
    }

    #[test]
    fn test_parse_and_serialize_roundtrip() {
        let input = make_test_input();

        let prompt = parse_prompt(&input, "test.md").unwrap();
        assert_eq!(prompt.meta.title, "Test Prompt");
        assert_eq!(prompt.meta.id, "test-id-123");
        assert!(prompt.body.contains("{{variable}}"));

        let serialized = serialize_prompt(&prompt).unwrap();
        let reparsed = parse_prompt(&serialized, "test.md").unwrap();
        assert_eq!(reparsed.meta.title, prompt.meta.title);
        assert_eq!(reparsed.meta.id, prompt.meta.id);
        assert_eq!(reparsed.meta.prompt_type, prompt.meta.prompt_type);
        assert_eq!(reparsed.meta.tags, prompt.meta.tags);
        assert_eq!(reparsed.meta.target, prompt.meta.target);
        assert_eq!(reparsed.meta.version, prompt.meta.version);
        assert_eq!(reparsed.meta.created, prompt.meta.created);
        assert_eq!(reparsed.meta.modified, prompt.meta.modified);
        assert_eq!(reparsed.meta.composable, prompt.meta.composable);
        assert_eq!(reparsed.body.trim(), prompt.body.trim());
    }

    #[test]
    fn test_parse_with_bom() {
        let input = format!("\u{feff}{}", make_test_input());
        let prompt = parse_prompt(&input, "bom.md").unwrap();
        assert_eq!(prompt.meta.title, "Test Prompt");
    }

    #[test]
    fn test_parse_with_windows_line_endings() {
        let input = make_test_input().replace('\n', "\r\n");
        let prompt = parse_prompt(&input, "windows.md").unwrap();
        assert_eq!(prompt.meta.title, "Test Prompt");
        assert_eq!(prompt.meta.id, "test-id-123");
        assert!(prompt.body.contains("{{variable}}"));
    }

    #[test]
    fn test_parse_with_trailing_whitespace_in_frontmatter() {
        let input = "---  \nid: \"ws-test\"  \ntitle: \"Whitespace Test\"  \ntype: snippet\ntarget: []\ntags: []\nversion: 1\ncreated: \"2026-01-01\"\nmodified: \"2026-01-01\"\nvariables: {}\ncomposable: false\n---\n\nBody here.\n";
        let prompt = parse_prompt(input, "ws.md").unwrap();
        assert_eq!(prompt.meta.title, "Whitespace Test");
        assert_eq!(prompt.meta.id, "ws-test");
    }

    #[test]
    fn test_parse_missing_frontmatter() {
        let result = parse_prompt("No frontmatter here", "bad.md");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_unclosed_frontmatter() {
        let result = parse_prompt("---\nid: test\n", "unclosed.md");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_empty_body() {
        let input = "---\nid: \"empty\"\ntitle: \"Empty Body\"\ntype: snippet\ntarget: []\ntags: []\nversion: 1\ncreated: \"2026-01-01\"\nmodified: \"2026-01-01\"\nvariables: {}\ncomposable: false\n---\n";
        let prompt = parse_prompt(input, "empty.md").unwrap();
        assert_eq!(prompt.body, "");
    }

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("My Cool Prompt!"), "my-cool-prompt");
        assert_eq!(slugify("  spaced  out  "), "spaced-out");
        assert_eq!(slugify("CamelCase Title"), "camelcase-title");
        assert_eq!(slugify("special@#$chars"), "special-chars");
        assert_eq!(slugify(""), "untitled");
        assert_eq!(slugify("---"), "untitled");
    }

    #[test]
    fn test_parse_variables_with_options() {
        let input = r#"---
id: "var-opts"
title: "Variable Options Test"
type: skill
target:
  - claude
tags:
  - test
version: 1
created: "2026-01-01"
modified: "2026-01-01"
variables:
  language:
    default: "rust"
    description: "Programming language to use"
    options:
      - rust
      - python
      - typescript
      - go
  style:
    default: "concise"
    description: "Response style"
    options:
      - concise
      - verbose
      - detailed
composable: false
---

Write {{language}} code in a {{style}} style.
"#;
        let prompt = parse_prompt(input, "var-opts.md").unwrap();
        assert_eq!(prompt.meta.variables.len(), 2);

        let lang = &prompt.meta.variables["language"];
        assert_eq!(lang.default, Some("rust".to_string()));
        assert_eq!(lang.description, Some("Programming language to use".to_string()));
        let opts = lang.options.as_ref().unwrap();
        assert_eq!(opts.len(), 4);
        assert_eq!(opts[0], "rust");
        assert_eq!(opts[3], "go");

        let style = &prompt.meta.variables["style"];
        assert_eq!(style.default, Some("concise".to_string()));
        let style_opts = style.options.as_ref().unwrap();
        assert_eq!(style_opts.len(), 3);
    }

    #[test]
    fn test_parse_with_extra_unknown_yaml_fields() {
        // Forward compatibility: unknown fields should be silently ignored
        let input = r#"---
id: "fwd-compat"
title: "Forward Compat Test"
type: snippet
target: []
tags: []
version: 1
created: "2026-01-01"
modified: "2026-01-01"
variables: {}
composable: false
author: "someone"
license: "MIT"
some_future_field:
  nested: true
  count: 42
---

Body text.
"#;
        let prompt = parse_prompt(input, "fwd.md").unwrap();
        assert_eq!(prompt.meta.id, "fwd-compat");
        assert_eq!(prompt.meta.title, "Forward Compat Test");
    }

    #[test]
    fn test_serialize_complex_variables_roundtrip() {
        // Create a prompt with complex nested variables and verify
        // serialization produces valid YAML that re-parses correctly
        let meta = PromptMeta {
            id: "complex-vars".to_string(),
            title: "Complex Variables".to_string(),
            prompt_type: PromptType::Template,
            target: vec!["claude".to_string(), "openai".to_string(), "gemini".to_string()],
            tags: vec!["multi-lang".to_string(), "code-gen".to_string()],
            version: 2,
            created: "2026-02-01".to_string(),
            modified: "2026-03-15".to_string(),
            variables: {
                let mut map = HashMap::new();
                map.insert(
                    "language".to_string(),
                    crate::models::prompt::VariableDefinition {
                        default: Some("python".to_string()),
                        description: Some("Target programming language".to_string()),
                        options: Some(vec![
                            "python".to_string(),
                            "rust".to_string(),
                            "typescript".to_string(),
                        ]),
                    },
                );
                map.insert(
                    "framework".to_string(),
                    crate::models::prompt::VariableDefinition {
                        default: None,
                        description: Some("Optional framework".to_string()),
                        options: None,
                    },
                );
                map.insert(
                    "output_format".to_string(),
                    crate::models::prompt::VariableDefinition {
                        default: Some("markdown".to_string()),
                        description: None,
                        options: Some(vec!["markdown".to_string(), "json".to_string(), "plain".to_string()]),
                    },
                );
                map
            },
            composable: true,
            insert_point: Some("before-response".to_string()),
        };
        let prompt = Prompt {
            meta,
            body: "Generate {{language}} code using {{framework}} and output as {{output_format}}.".to_string(),
            file_path: "templates/complex.md".to_string(),
        };

        let serialized = serialize_prompt(&prompt).unwrap();
        let reparsed = parse_prompt(&serialized, "templates/complex.md").unwrap();

        // Verify all fields survived the roundtrip
        assert_eq!(reparsed.meta.id, "complex-vars");
        assert_eq!(reparsed.meta.title, "Complex Variables");
        assert_eq!(reparsed.meta.prompt_type, PromptType::Template);
        assert_eq!(reparsed.meta.target.len(), 3);
        assert_eq!(reparsed.meta.tags.len(), 2);
        assert_eq!(reparsed.meta.version, 2);
        assert_eq!(reparsed.meta.composable, true);
        assert_eq!(reparsed.meta.insert_point, Some("before-response".to_string()));
        assert_eq!(reparsed.meta.variables.len(), 3);

        // Verify each variable definition survived
        let lang = &reparsed.meta.variables["language"];
        assert_eq!(lang.default, Some("python".to_string()));
        assert_eq!(lang.description, Some("Target programming language".to_string()));
        assert_eq!(lang.options.as_ref().unwrap().len(), 3);

        let fw = &reparsed.meta.variables["framework"];
        assert_eq!(fw.default, None);
        assert_eq!(fw.description, Some("Optional framework".to_string()));
        assert_eq!(fw.options, None);

        let fmt = &reparsed.meta.variables["output_format"];
        assert_eq!(fmt.default, Some("markdown".to_string()));
        assert_eq!(fmt.description, None);
        assert_eq!(fmt.options.as_ref().unwrap().len(), 3);
    }

    #[test]
    fn test_roundtrip_preserves_all_fields() {
        let meta = PromptMeta {
            id: "rt-test".to_string(),
            title: "Roundtrip Test".to_string(),
            prompt_type: PromptType::Skill,
            target: vec!["claude".to_string(), "openai".to_string()],
            tags: vec!["coding".to_string(), "review".to_string()],
            version: 3,
            created: "2026-02-10".to_string(),
            modified: "2026-03-20".to_string(),
            variables: {
                let mut map = HashMap::new();
                map.insert(
                    "lang".to_string(),
                    crate::models::prompt::VariableDefinition {
                        default: Some("rust".to_string()),
                        description: Some("Programming language".to_string()),
                        options: Some(vec!["rust".to_string(), "python".to_string()]),
                    },
                );
                map
            },
            composable: true,
            insert_point: Some("after-context".to_string()),
        };
        let prompt = Prompt {
            meta,
            body: "Review this {{lang}} code.".to_string(),
            file_path: "skills/review.md".to_string(),
        };

        let serialized = serialize_prompt(&prompt).unwrap();
        let reparsed = parse_prompt(&serialized, "skills/review.md").unwrap();

        assert_eq!(reparsed.meta.id, prompt.meta.id);
        assert_eq!(reparsed.meta.title, prompt.meta.title);
        assert_eq!(reparsed.meta.prompt_type, prompt.meta.prompt_type);
        assert_eq!(reparsed.meta.target, prompt.meta.target);
        assert_eq!(reparsed.meta.tags, prompt.meta.tags);
        assert_eq!(reparsed.meta.version, prompt.meta.version);
        assert_eq!(reparsed.meta.created, prompt.meta.created);
        assert_eq!(reparsed.meta.modified, prompt.meta.modified);
        assert_eq!(reparsed.meta.composable, prompt.meta.composable);
        assert_eq!(reparsed.meta.insert_point, prompt.meta.insert_point);
        assert!(reparsed.meta.variables.contains_key("lang"));
        let var = &reparsed.meta.variables["lang"];
        assert_eq!(var.default, Some("rust".to_string()));
        assert_eq!(var.options, Some(vec!["rust".to_string(), "python".to_string()]));
    }
}
