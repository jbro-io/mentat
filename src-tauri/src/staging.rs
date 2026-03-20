use std::collections::HashMap;

/// Replace `{{name}}` placeholders in `body` with values from the map.
///
/// - Only matches `{{word}}` where `word` is `[a-zA-Z0-9_]` characters.
/// - Unresolved placeholders (no matching key) are left as-is.
/// - Nested braces like `{{{foo}}}` resolve the inner `{{foo}}` and keep the outer braces.
/// - Empty body returns empty string.
pub fn resolve_variables(body: &str, values: &HashMap<String, String>) -> String {
    if body.is_empty() {
        return String::new();
    }

    let bytes = body.as_bytes();
    let len = bytes.len();
    let mut result = String::with_capacity(body.len());
    let mut i = 0;

    while i < len {
        // Look for `{{`
        if i + 1 < len && bytes[i] == b'{' && bytes[i + 1] == b'{' {
            // Try to find a valid variable name followed by `}}`
            let start = i + 2;
            if let Some((name, end)) = scan_variable_name(body, start) {
                if let Some(value) = values.get(&name) {
                    result.push_str(value);
                } else {
                    // Leave unresolved placeholder as-is
                    result.push_str(&body[i..end]);
                }
                i = end;
            } else {
                // Not a valid placeholder, emit the `{` and advance
                result.push('{');
                i += 1;
            }
        } else {
            result.push(body[i..].chars().next().unwrap());
            i += body[i..].chars().next().unwrap().len_utf8();
        }
    }

    result
}

/// Scan for a valid variable name starting at `start`, expecting `}}` after it.
///
/// Returns `(name, end_index)` where `end_index` is the position right after `}}`.
/// Variable names consist of `[a-zA-Z0-9_]` and must be non-empty.
fn scan_variable_name(body: &str, start: usize) -> Option<(String, usize)> {
    let bytes = body.as_bytes();
    let len = bytes.len();
    let mut pos = start;

    // Collect variable name characters
    while pos < len {
        let b = bytes[pos];
        if b.is_ascii_alphanumeric() || b == b'_' {
            pos += 1;
        } else {
            break;
        }
    }

    // Must have at least one character
    if pos == start {
        return None;
    }

    // Must be followed by `}}`
    if pos + 1 < len && bytes[pos] == b'}' && bytes[pos + 1] == b'}' {
        let name = body[start..pos].to_string();
        Some((name, pos + 2))
    } else {
        None
    }
}

/// Extract unique variable names from `{{word}}` patterns in the body.
///
/// Returns names sorted alphabetically. Only matches `[a-zA-Z0-9_]` variable names.
#[allow(dead_code)]
pub fn extract_variables(body: &str) -> Vec<String> {
    if body.is_empty() {
        return Vec::new();
    }

    let bytes = body.as_bytes();
    let len = bytes.len();
    let mut names = Vec::new();
    let mut i = 0;

    while i < len {
        if i + 1 < len && bytes[i] == b'{' && bytes[i + 1] == b'{' {
            let start = i + 2;
            if let Some((name, end)) = scan_variable_name(body, start) {
                if !names.contains(&name) {
                    names.push(name);
                }
                i = end;
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }

    names.sort();
    names
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- resolve_variables tests ---

    #[test]
    fn test_resolve_basic() {
        let mut values = HashMap::new();
        values.insert("name".to_string(), "Alice".to_string());
        assert_eq!(resolve_variables("Hello {{name}}!", &values), "Hello Alice!");
    }

    #[test]
    fn test_resolve_multiple_variables() {
        let mut values = HashMap::new();
        values.insert("first".to_string(), "John".to_string());
        values.insert("last".to_string(), "Doe".to_string());
        assert_eq!(
            resolve_variables("{{first}} {{last}}", &values),
            "John Doe"
        );
    }

    #[test]
    fn test_resolve_unresolved_left_as_is() {
        let values = HashMap::new();
        assert_eq!(
            resolve_variables("Hello {{name}}!", &values),
            "Hello {{name}}!"
        );
    }

    #[test]
    fn test_resolve_partial_resolution() {
        let mut values = HashMap::new();
        values.insert("known".to_string(), "yes".to_string());
        assert_eq!(
            resolve_variables("{{known}} and {{unknown}}", &values),
            "yes and {{unknown}}"
        );
    }

    #[test]
    fn test_resolve_empty_body() {
        let values = HashMap::new();
        assert_eq!(resolve_variables("", &values), "");
    }

    #[test]
    fn test_resolve_no_variables() {
        let values = HashMap::new();
        assert_eq!(
            resolve_variables("Just plain text", &values),
            "Just plain text"
        );
    }

    #[test]
    fn test_resolve_nested_braces() {
        // {{{foo}}} should resolve inner {{foo}} and keep outer braces
        let mut values = HashMap::new();
        values.insert("foo".to_string(), "bar".to_string());
        assert_eq!(resolve_variables("{{{foo}}}", &values), "{bar}");
    }

    #[test]
    fn test_resolve_single_brace() {
        let values = HashMap::new();
        assert_eq!(
            resolve_variables("a { b } c", &values),
            "a { b } c"
        );
    }

    #[test]
    fn test_resolve_special_chars_in_values() {
        let mut values = HashMap::new();
        values.insert("code".to_string(), "fn main() { println!(\"hello\"); }".to_string());
        assert_eq!(
            resolve_variables("Code: {{code}}", &values),
            "Code: fn main() { println!(\"hello\"); }"
        );
    }

    #[test]
    fn test_resolve_empty_variable_name() {
        // {{}} should not be treated as a variable
        let values = HashMap::new();
        assert_eq!(resolve_variables("a {{}} b", &values), "a {{}} b");
    }

    #[test]
    fn test_resolve_underscore_variable() {
        let mut values = HashMap::new();
        values.insert("my_var".to_string(), "value".to_string());
        assert_eq!(
            resolve_variables("{{my_var}}", &values),
            "value"
        );
    }

    #[test]
    fn test_resolve_numeric_variable() {
        let mut values = HashMap::new();
        values.insert("var1".to_string(), "one".to_string());
        assert_eq!(resolve_variables("{{var1}}", &values), "one");
    }

    #[test]
    fn test_resolve_repeated_variable() {
        let mut values = HashMap::new();
        values.insert("x".to_string(), "X".to_string());
        assert_eq!(
            resolve_variables("{{x}} and {{x}}", &values),
            "X and X"
        );
    }

    #[test]
    fn test_resolve_value_with_newlines() {
        let mut values = HashMap::new();
        values.insert("block".to_string(), "line1\nline2\nline3".to_string());
        assert_eq!(
            resolve_variables("{{block}}", &values),
            "line1\nline2\nline3"
        );
    }

    #[test]
    fn test_resolve_adjacent_variables() {
        let mut values = HashMap::new();
        values.insert("a".to_string(), "A".to_string());
        values.insert("b".to_string(), "B".to_string());
        assert_eq!(resolve_variables("{{a}}{{b}}", &values), "AB");
    }

    #[test]
    fn test_resolve_invalid_chars_in_name() {
        // {{foo-bar}} should NOT be resolved (hyphens not allowed in variable names)
        let mut values = HashMap::new();
        values.insert("foo-bar".to_string(), "value".to_string());
        assert_eq!(
            resolve_variables("{{foo-bar}}", &values),
            "{{foo-bar}}"
        );
    }

    #[test]
    fn test_resolve_unicode_in_body() {
        let mut values = HashMap::new();
        values.insert("emoji".to_string(), "world".to_string());
        assert_eq!(
            resolve_variables("Hello {{emoji}} \u{1F600}", &values),
            "Hello world \u{1F600}"
        );
    }

    // --- extract_variables tests ---

    #[test]
    fn test_extract_basic() {
        let vars = extract_variables("Hello {{name}}, welcome to {{place}}!");
        assert_eq!(vars, vec!["name", "place"]);
    }

    #[test]
    fn test_extract_empty_body() {
        let vars = extract_variables("");
        assert!(vars.is_empty());
    }

    #[test]
    fn test_extract_no_variables() {
        let vars = extract_variables("Just plain text");
        assert!(vars.is_empty());
    }

    #[test]
    fn test_extract_duplicates_removed() {
        let vars = extract_variables("{{x}} and {{y}} and {{x}} again");
        assert_eq!(vars, vec!["x", "y"]);
    }

    #[test]
    fn test_extract_sorted() {
        let vars = extract_variables("{{zebra}} {{alpha}} {{middle}}");
        assert_eq!(vars, vec!["alpha", "middle", "zebra"]);
    }

    #[test]
    fn test_extract_nested_braces() {
        // {{{foo}}} contains {{foo}}
        let vars = extract_variables("{{{foo}}}");
        assert_eq!(vars, vec!["foo"]);
    }

    #[test]
    fn test_extract_ignores_invalid_names() {
        // Hyphens, spaces, empty names should not be extracted
        let vars = extract_variables("{{valid}} {{in-valid}} {{}} {{also_valid}}");
        assert_eq!(vars, vec!["also_valid", "valid"]);
    }

    #[test]
    fn test_extract_underscore_and_numeric() {
        let vars = extract_variables("{{var_1}} {{_private}} {{ABC123}}");
        assert_eq!(vars, vec!["ABC123", "_private", "var_1"]);
    }
}
