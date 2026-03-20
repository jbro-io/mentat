use crate::models::prompt::Prompt;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub file_path: String,
    pub score: u32,
    pub matched_field: String,
}

struct SearchItem {
    id: String,
    title: String,
    file_path: String,
    tags: String,
    body_preview: String,
}

pub struct SearchEngine {
    items: Vec<SearchItem>,
}

impl SearchEngine {
    pub fn new() -> Self {
        Self { items: Vec::new() }
    }

    pub fn rebuild_index(&mut self, prompts: &[Prompt]) {
        self.items = prompts
            .iter()
            .map(|p| SearchItem {
                id: p.meta.id.clone(),
                title: p.meta.title.clone(),
                file_path: p.file_path.clone(),
                tags: p.meta.tags.join(" "),
                body_preview: p.body.chars().take(200).collect(),
            })
            .collect();
    }

    pub fn search(&self, query: &str, limit: usize) -> Vec<SearchResult> {
        if query.is_empty() {
            return vec![];
        }

        let query_lower = query.to_lowercase();
        let mut results: Vec<SearchResult> = Vec::new();

        for item in &self.items {
            let mut best_score: u32 = 0;
            let mut matched_field = String::new();

            // Title match (highest weight: 4x)
            if let Some(score) = fuzzy_score(&query_lower, &item.title.to_lowercase()) {
                let weighted = score * 4;
                if weighted > best_score {
                    best_score = weighted;
                    matched_field = "title".to_string();
                }
            }

            // Tags match (2x weight)
            if let Some(score) = fuzzy_score(&query_lower, &item.tags.to_lowercase()) {
                let weighted = score * 2;
                if weighted > best_score {
                    best_score = weighted;
                    matched_field = "tags".to_string();
                }
            }

            // File path match (1.5x weight, rounded)
            if let Some(score) = fuzzy_score(&query_lower, &item.file_path.to_lowercase()) {
                let weighted = score * 3 / 2;
                if weighted > best_score {
                    best_score = weighted;
                    matched_field = "file_path".to_string();
                }
            }

            // Body match (1x weight)
            if let Some(score) = fuzzy_score(&query_lower, &item.body_preview.to_lowercase()) {
                if score > best_score {
                    best_score = score;
                    matched_field = "body".to_string();
                }
            }

            if best_score > 0 {
                results.push(SearchResult {
                    id: item.id.clone(),
                    title: item.title.clone(),
                    file_path: item.file_path.clone(),
                    score: best_score,
                    matched_field,
                });
            }
        }

        results.sort_by(|a, b| b.score.cmp(&a.score));
        results.truncate(limit);
        results
    }
}

/// Fuzzy matching with scoring. Returns a score if all query characters appear
/// in order in the target, None otherwise.
///
/// Scoring bonuses:
/// - Consecutive character matches are rewarded with increasing bonus
/// - Exact substring match gets a large bonus
/// - Exact prefix match gets the highest bonus
/// - Matches at word boundaries (after space, hyphen, underscore) get a bonus
fn fuzzy_score(query: &str, target: &str) -> Option<u32> {
    if query.is_empty() {
        return None;
    }

    let mut score: u32 = 0;
    let target_chars: Vec<char> = target.chars().collect();
    let mut target_idx = 0;
    let mut consecutive: u32 = 0;
    for qc in query.chars() {
        let mut found = false;
        while target_idx < target_chars.len() {
            let tc = target_chars[target_idx];
            target_idx += 1;

            if tc == qc {
                consecutive += 1;
                score += consecutive; // Reward consecutive matches

                // Bonus for matching at a word boundary
                let match_pos = target_idx - 1;
                if match_pos == 0 {
                    score += 3; // Start of string
                } else {
                    let prev = target_chars[match_pos - 1];
                    if prev == ' ' || prev == '-' || prev == '_' || prev == '/' {
                        score += 2; // Word boundary
                    }
                }

                found = true;
                break;
            } else {
                consecutive = 0;
            }
        }
        if !found {
            return None;
        }
    }

    // Bonus for exact substring match
    if target.contains(query) {
        score += (query.len() as u32) * 5;

        // Extra bonus for exact prefix match (query appears at the very start)
        if target.starts_with(query) {
            score += (query.len() as u32) * 10;
        }

        // Bonus for matching at a word boundary within the string
        // e.g., searching "review" matches "code-review" at a word boundary
        if !target.starts_with(query) {
            for (i, _) in target.match_indices(query) {
                if i > 0 {
                    let prev = target.as_bytes()[i - 1];
                    if prev == b' ' || prev == b'-' || prev == b'_' || prev == b'/' {
                        score += (query.len() as u32) * 3;
                        break;
                    }
                }
            }
        }
    }

    // Bonus for shorter targets (more specific match)
    if !target.is_empty() {
        let ratio = (query.len() as f32) / (target.len() as f32);
        score += (ratio * 10.0) as u32;
    }

    Some(score)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exact_prefix_ranks_highest() {
        let score_prefix = fuzzy_score("code", "code review helper").unwrap();
        let score_middle = fuzzy_score("code", "my code review").unwrap();
        let score_fuzzy = fuzzy_score("code", "c-o-d-e scattered").unwrap();

        assert!(
            score_prefix > score_middle,
            "prefix {} should beat middle {}",
            score_prefix,
            score_middle
        );
        assert!(
            score_middle > score_fuzzy,
            "middle {} should beat fuzzy {}",
            score_middle,
            score_fuzzy
        );
    }

    #[test]
    fn test_no_match_returns_none() {
        assert!(fuzzy_score("xyz", "abc").is_none());
        assert!(fuzzy_score("abc", "ab").is_none()); // not enough chars
    }

    #[test]
    fn test_empty_query_returns_none() {
        assert!(fuzzy_score("", "anything").is_none());
    }

    #[test]
    fn test_consecutive_match_bonus() {
        let consecutive = fuzzy_score("abc", "abcdef").unwrap();
        let scattered = fuzzy_score("abc", "axbxcx").unwrap();
        assert!(
            consecutive > scattered,
            "consecutive {} should beat scattered {}",
            consecutive,
            scattered
        );
    }

    #[test]
    fn test_search_returns_limited_results() {
        let mut engine = SearchEngine::new();
        let prompts: Vec<Prompt> = (0..10)
            .map(|i| Prompt {
                meta: crate::models::prompt::PromptMeta {
                    id: format!("id-{}", i),
                    title: format!("Test Prompt {}", i),
                    prompt_type: crate::models::prompt::PromptType::Snippet,
                    target: vec![],
                    tags: vec!["test".to_string()],
                    version: 1,
                    created: "2026-01-01".to_string(),
                    modified: "2026-01-01".to_string(),
                    variables: std::collections::HashMap::new(),
                    composable: false,
                    insert_point: None,
                },
                body: "Test body content".to_string(),
                file_path: format!("snippets/test-prompt-{}.md", i),
            })
            .collect();

        engine.rebuild_index(&prompts);
        let results = engine.search("test", 3);
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_search_empty_query() {
        let engine = SearchEngine::new();
        let results = engine.search("", 10);
        assert!(results.is_empty());
    }

    #[test]
    fn test_file_path_search() {
        let mut engine = SearchEngine::new();
        let prompts = vec![Prompt {
            meta: crate::models::prompt::PromptMeta {
                id: "fp-1".to_string(),
                title: "Something Else".to_string(),
                prompt_type: crate::models::prompt::PromptType::Snippet,
                target: vec![],
                tags: vec![],
                version: 1,
                created: "2026-01-01".to_string(),
                modified: "2026-01-01".to_string(),
                variables: std::collections::HashMap::new(),
                composable: false,
                insert_point: None,
            },
            body: "No match here".to_string(),
            file_path: "skills/claude/review.md".to_string(),
        }];

        engine.rebuild_index(&prompts);
        let results = engine.search("review", 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].matched_field, "file_path");
    }

    #[test]
    fn test_word_boundary_bonus() {
        // "review" appearing at a word boundary in "code-review" should score
        // higher than "review" scattered across characters
        let boundary = fuzzy_score("review", "code-review").unwrap();
        let no_boundary = fuzzy_score("review", "previewing").unwrap();
        assert!(
            boundary > no_boundary,
            "boundary {} should beat no_boundary {}",
            boundary,
            no_boundary
        );
    }

    #[test]
    fn test_search_special_characters_in_query() {
        let mut engine = SearchEngine::new();
        let prompts = vec![Prompt {
            meta: crate::models::prompt::PromptMeta {
                id: "sp-1".to_string(),
                title: "C++ Code Review".to_string(),
                prompt_type: crate::models::prompt::PromptType::Snippet,
                target: vec![],
                tags: vec!["c++".to_string()],
                version: 1,
                created: "2026-01-01".to_string(),
                modified: "2026-01-01".to_string(),
                variables: std::collections::HashMap::new(),
                composable: false,
                insert_point: None,
            },
            body: "Review C++ code with special chars: @#$%".to_string(),
            file_path: "snippets/cpp-review.md".to_string(),
        }];

        engine.rebuild_index(&prompts);

        // Searching with special characters should not panic
        let results = engine.search("c++", 10);
        // "c++" won't fuzzy-match well but should not crash
        assert!(results.len() <= 1);

        // More special chars - should not panic
        let results = engine.search("@#$", 10);
        assert!(results.len() <= 1);

        let results = engine.search("()", 10);
        assert!(results.is_empty());

        let results = engine.search("***", 10);
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_very_long_query() {
        let mut engine = SearchEngine::new();
        let prompts = vec![Prompt {
            meta: crate::models::prompt::PromptMeta {
                id: "long-1".to_string(),
                title: "Short Title".to_string(),
                prompt_type: crate::models::prompt::PromptType::Snippet,
                target: vec![],
                tags: vec![],
                version: 1,
                created: "2026-01-01".to_string(),
                modified: "2026-01-01".to_string(),
                variables: std::collections::HashMap::new(),
                composable: false,
                insert_point: None,
            },
            body: "Short body".to_string(),
            file_path: "snippets/short.md".to_string(),
        }];

        engine.rebuild_index(&prompts);

        // A very long query should not panic, just return no results
        let long_query = "a".repeat(10_000);
        let results = engine.search(&long_query, 10);
        assert!(results.is_empty());

        // Long query with spaces
        let long_words: String = (0..1000).map(|i| format!("word{}", i)).collect::<Vec<_>>().join(" ");
        let results = engine.search(&long_words, 10);
        assert!(results.is_empty());
    }

    #[test]
    fn test_title_match_beats_body_match() {
        let mut engine = SearchEngine::new();
        let prompts = vec![
            Prompt {
                meta: crate::models::prompt::PromptMeta {
                    id: "title-match".to_string(),
                    title: "Database Migration Helper".to_string(),
                    prompt_type: crate::models::prompt::PromptType::Snippet,
                    target: vec![],
                    tags: vec![],
                    version: 1,
                    created: "2026-01-01".to_string(),
                    modified: "2026-01-01".to_string(),
                    variables: std::collections::HashMap::new(),
                    composable: false,
                    insert_point: None,
                },
                body: "This prompt helps with code tasks".to_string(),
                file_path: "snippets/db-migration.md".to_string(),
            },
            Prompt {
                meta: crate::models::prompt::PromptMeta {
                    id: "body-match".to_string(),
                    title: "General Code Assistant".to_string(),
                    prompt_type: crate::models::prompt::PromptType::Snippet,
                    target: vec![],
                    tags: vec![],
                    version: 1,
                    created: "2026-01-01".to_string(),
                    modified: "2026-01-01".to_string(),
                    variables: std::collections::HashMap::new(),
                    composable: false,
                    insert_point: None,
                },
                body: "Handles database migration and schema changes".to_string(),
                file_path: "snippets/code-assistant.md".to_string(),
            },
        ];

        engine.rebuild_index(&prompts);
        let results = engine.search("migration", 10);

        assert!(results.len() >= 2, "Both prompts should match 'migration'");

        // The prompt with "migration" in the title should rank first
        assert_eq!(
            results[0].id, "title-match",
            "Title match (id={}, score={}) should rank above body match (id={}, score={})",
            results[0].id, results[0].score, results[1].id, results[1].score
        );
        assert_eq!(results[0].matched_field, "title");
    }

    #[test]
    fn test_search_single_character_query() {
        let mut engine = SearchEngine::new();
        let prompts = vec![Prompt {
            meta: crate::models::prompt::PromptMeta {
                id: "sc-1".to_string(),
                title: "A Simple Prompt".to_string(),
                prompt_type: crate::models::prompt::PromptType::Snippet,
                target: vec![],
                tags: vec![],
                version: 1,
                created: "2026-01-01".to_string(),
                modified: "2026-01-01".to_string(),
                variables: std::collections::HashMap::new(),
                composable: false,
                insert_point: None,
            },
            body: "Body text".to_string(),
            file_path: "snippets/simple.md".to_string(),
        }];

        engine.rebuild_index(&prompts);

        // Single character search should work without panic
        let results = engine.search("a", 10);
        assert!(!results.is_empty(), "Should match 'a' in title");
    }

    #[test]
    fn test_search_no_items_indexed() {
        let engine = SearchEngine::new();
        let results = engine.search("anything", 10);
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_result_limit_zero() {
        let mut engine = SearchEngine::new();
        let prompts = vec![Prompt {
            meta: crate::models::prompt::PromptMeta {
                id: "lz-1".to_string(),
                title: "Test Prompt".to_string(),
                prompt_type: crate::models::prompt::PromptType::Snippet,
                target: vec![],
                tags: vec![],
                version: 1,
                created: "2026-01-01".to_string(),
                modified: "2026-01-01".to_string(),
                variables: std::collections::HashMap::new(),
                composable: false,
                insert_point: None,
            },
            body: "Body".to_string(),
            file_path: "snippets/test.md".to_string(),
        }];

        engine.rebuild_index(&prompts);
        let results = engine.search("test", 0);
        assert!(results.is_empty(), "Limit 0 should return empty results");
    }
}
