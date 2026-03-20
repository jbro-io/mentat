use std::path::Path;
use std::process::Command;

use crate::error::AppError;
use crate::models::git::{GitStatus, SyncResult};

/// Check if the given path is inside a git repository.
pub fn is_git_repo(path: &Path) -> bool {
    path.join(".git").exists()
}

/// Initialize a new git repository at the given path.
pub fn init_repo(path: &Path) -> Result<(), AppError> {
    let output = Command::new("git")
        .arg("init")
        .current_dir(path)
        .output()
        .map_err(|e| AppError::GitError(format!("Failed to run git init: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::GitError(format!("git init failed: {}", stderr)));
    }

    Ok(())
}

/// Get the current git status for the repository at the given path.
///
/// Parses `git status --porcelain -b` for branch and changes info,
/// and uses `git rev-list` to determine ahead/behind counts relative
/// to the upstream tracking branch.
pub fn git_status(path: &Path) -> Result<GitStatus, AppError> {
    let output = Command::new("git")
        .args(["status", "--porcelain", "-b"])
        .current_dir(path)
        .output()
        .map_err(|e| AppError::GitError(format!("Failed to run git status: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::GitError(format!("git status failed: {}", stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    // Parse the branch header line: "## branch...upstream [ahead N, behind M]"
    let mut branch = String::from("main");
    let mut has_remote = false;

    if let Some(header) = lines.first() {
        if let Some(rest) = header.strip_prefix("## ") {
            // Could be "main...origin/main" or "main" or "No commits yet on main"
            if rest.starts_with("No commits yet on ") {
                branch = rest
                    .strip_prefix("No commits yet on ")
                    .unwrap_or("main")
                    .to_string();
            } else {
                // Split on "..." to get local branch and upstream
                let branch_part = if let Some(dots_idx) = rest.find("...") {
                    has_remote = true;
                    &rest[..dots_idx]
                } else {
                    // No upstream tracking; may have trailing info after space
                    rest.split_whitespace().next().unwrap_or("main")
                };
                branch = branch_part.to_string();
            }
        }
    }

    // Check for file changes: any line after the branch header indicates changes
    let has_changes = lines.iter().skip(1).any(|line| !line.is_empty());

    // Get ahead/behind counts
    // @{u}..HEAD = commits on HEAD not on upstream = ahead
    // HEAD..@{u} = commits on upstream not on HEAD = behind
    let ahead = get_rev_count(path, "@{u}..HEAD").unwrap_or(0);
    let behind = get_rev_count(path, "HEAD..@{u}").unwrap_or(0);

    // Double-check has_remote by seeing if rev-parse @{u} succeeds
    if !has_remote {
        has_remote = Command::new("git")
            .args(["rev-parse", "--abbrev-ref", "@{u}"])
            .current_dir(path)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
    }

    Ok(GitStatus {
        has_changes,
        ahead,
        behind,
        branch,
        has_remote,
    })
}

/// Get the count from a git rev-list range (e.g. "HEAD..@{u}" or "@{u}..HEAD").
/// Returns None if the command fails (no upstream, no commits, etc.).
fn get_rev_count(path: &Path, range: &str) -> Option<u32> {
    let output = Command::new("git")
        .args(["rev-list", "--count", range])
        .current_dir(path)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout.trim().parse().ok()
}

/// Run `git pull --rebase` in the given path.
pub fn git_pull(path: &Path) -> Result<(), AppError> {
    let output = Command::new("git")
        .args(["pull", "--rebase"])
        .current_dir(path)
        .output()
        .map_err(|e| AppError::GitError(format!("Failed to run git pull: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::GitError(format!("git pull failed: {}", stderr)));
    }

    Ok(())
}

/// Add a remote to the git repository, set upstream, and push.
pub fn add_remote(path: &Path, remote_url: &str) -> Result<(), AppError> {
    if remote_url.trim().is_empty() {
        return Err(AppError::GitError("Remote URL cannot be empty".to_string()));
    }

    // Check if 'origin' remote already exists
    let existing = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(path)
        .output();

    if let Ok(output) = existing {
        if output.status.success() {
            // Remote exists — update it
            let output = Command::new("git")
                .args(["remote", "set-url", "origin", remote_url])
                .current_dir(path)
                .output()
                .map_err(|e| AppError::GitError(format!("Failed to set remote URL: {}", e)))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(AppError::GitError(format!("git remote set-url failed: {}", stderr)));
            }
        } else {
            // No remote — add one
            let output = Command::new("git")
                .args(["remote", "add", "origin", remote_url])
                .current_dir(path)
                .output()
                .map_err(|e| AppError::GitError(format!("Failed to add remote: {}", e)))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(AppError::GitError(format!("git remote add failed: {}", stderr)));
            }
        }
    } else {
        // git remote command failed entirely — try adding
        let output = Command::new("git")
            .args(["remote", "add", "origin", remote_url])
            .current_dir(path)
            .output()
            .map_err(|e| AppError::GitError(format!("Failed to add remote: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::GitError(format!("git remote add failed: {}", stderr)));
        }
    }

    // Ensure there's at least one commit before pushing
    let has_commits = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .current_dir(path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !has_commits {
        // Create an initial commit
        let _ = Command::new("git")
            .args(["add", "-A"])
            .current_dir(path)
            .output();
        let _ = Command::new("git")
            .args(["commit", "-m", "initial mentat sync"])
            .current_dir(path)
            .output();
    }

    // Get current branch name
    let branch_output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(path)
        .output()
        .map_err(|e| AppError::GitError(format!("Failed to get branch: {}", e)))?;

    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();
    let branch = if branch.is_empty() { "main".to_string() } else { branch };

    // Push and set upstream
    let output = Command::new("git")
        .args(["push", "-u", "origin", &branch])
        .current_dir(path)
        .output()
        .map_err(|e| AppError::GitError(format!("Failed to push: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Don't fail on push errors — the remote is still configured
        eprintln!("Initial push failed (remote configured anyway): {}", stderr);
    }

    Ok(())
}

/// Get the currently configured remote URL, if any.
pub fn get_remote_url(path: &Path) -> Option<String> {
    let output = Command::new("git")
        .args(["remote", "get-url", "origin"])
        .current_dir(path)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if url.is_empty() { None } else { Some(url) }
}

/// Full git sync cycle: add, commit, pull --rebase, push.
///
/// Each step is run individually so failures are granular.
/// If nothing to commit, the commit step is skipped.
/// If pull has conflicts, returns an error.
pub fn git_sync(path: &Path) -> Result<SyncResult, AppError> {
    // Step 1: git add -A
    let output = Command::new("git")
        .args(["add", "-A"])
        .current_dir(path)
        .output()
        .map_err(|e| AppError::GitError(format!("Failed to run git add: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::GitError(format!("git add failed: {}", stderr)));
    }

    // Step 2: git commit -m "mentat sync" (skip if nothing to commit)
    // Check if there are actually staged changes (after git add -A)
    let diff_output = Command::new("git")
        .args(["diff", "--cached", "--quiet"])
        .current_dir(path)
        .output()
        .map_err(|e| AppError::GitError(format!("Failed to check diff: {}", e)))?;

    let has_staged_changes = !diff_output.status.success(); // exit code 1 means there are diffs

    if has_staged_changes {
        let output = Command::new("git")
            .args(["commit", "-m", "mentat sync"])
            .current_dir(path)
            .output()
            .map_err(|e| AppError::GitError(format!("Failed to run git commit: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // "nothing to commit" is not a real error
            if !stderr.contains("nothing to commit") {
                return Err(AppError::GitError(format!(
                    "git commit failed: {}",
                    stderr
                )));
            }
        }
    }

    // Step 3: git pull --rebase (only if there's a remote)
    let has_remote = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "@{u}"])
        .current_dir(path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if has_remote {
        let output = Command::new("git")
            .args(["pull", "--rebase"])
            .current_dir(path)
            .output()
            .map_err(|e| AppError::GitError(format!("Failed to run git pull: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Abort the rebase if there are conflicts
            if stderr.contains("CONFLICT") || stderr.contains("conflict") {
                let _ = Command::new("git")
                    .args(["rebase", "--abort"])
                    .current_dir(path)
                    .output();
                return Err(AppError::GitError(
                    "Pull failed due to merge conflicts. Rebase has been aborted.".to_string(),
                ));
            }
            return Err(AppError::GitError(format!(
                "git pull --rebase failed: {}",
                stderr
            )));
        }

        // Step 4: git push
        let output = Command::new("git")
            .args(["push"])
            .current_dir(path)
            .output()
            .map_err(|e| AppError::GitError(format!("Failed to run git push: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::GitError(format!("git push failed: {}", stderr)));
        }

        Ok(SyncResult {
            success: true,
            message: "Synced successfully".to_string(),
        })
    } else {
        // No remote configured; just committed locally
        Ok(SyncResult {
            success: true,
            message: if has_staged_changes {
                "Changes committed locally (no remote configured)".to_string()
            } else {
                "Nothing to sync".to_string()
            },
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn setup_git_repo() -> tempfile::TempDir {
        let tmp = tempfile::tempdir().expect("Failed to create temp dir");
        Command::new("git")
            .args(["init"])
            .current_dir(tmp.path())
            .output()
            .expect("Failed to run git init");
        // Configure user for commits
        Command::new("git")
            .args(["config", "user.email", "test@test.com"])
            .current_dir(tmp.path())
            .output()
            .expect("Failed to set git email");
        Command::new("git")
            .args(["config", "user.name", "Test"])
            .current_dir(tmp.path())
            .output()
            .expect("Failed to set git name");
        tmp
    }

    #[test]
    fn test_is_git_repo() {
        let tmp = setup_git_repo();
        assert!(is_git_repo(tmp.path()));

        let non_git = tempfile::tempdir().expect("Failed to create temp dir");
        assert!(!is_git_repo(non_git.path()));
    }

    #[test]
    fn test_init_repo() {
        let tmp = tempfile::tempdir().expect("Failed to create temp dir");
        assert!(!is_git_repo(tmp.path()));
        init_repo(tmp.path()).expect("Failed to init repo");
        assert!(is_git_repo(tmp.path()));
    }

    #[test]
    fn test_git_status_empty_repo() {
        let tmp = setup_git_repo();
        let status = git_status(tmp.path()).expect("Failed to get status");
        assert!(!status.has_remote);
        assert!(!status.has_changes);
    }

    #[test]
    fn test_git_status_with_changes() {
        let tmp = setup_git_repo();
        // Create a file to have changes
        fs::write(tmp.path().join("test.txt"), "hello").expect("Failed to write file");
        let status = git_status(tmp.path()).expect("Failed to get status");
        assert!(status.has_changes);
        assert!(!status.has_remote);
    }

    #[test]
    fn test_git_sync_no_remote() {
        let tmp = setup_git_repo();
        fs::write(tmp.path().join("test.txt"), "hello").expect("Failed to write file");

        let result = git_sync(tmp.path()).expect("Failed to sync");
        assert!(result.success);
        assert!(result.message.contains("locally"));

        // After sync, status should show no changes
        let status = git_status(tmp.path()).expect("Failed to get status");
        assert!(!status.has_changes);
    }

    #[test]
    fn test_git_sync_nothing_to_commit() {
        let tmp = setup_git_repo();
        // Create initial commit so HEAD exists
        fs::write(tmp.path().join("test.txt"), "hello").expect("Failed to write file");
        git_sync(tmp.path()).expect("Failed to initial sync");

        // Sync again with no changes
        let result = git_sync(tmp.path()).expect("Failed to sync");
        assert!(result.success);
        assert!(result.message.contains("Nothing to sync"));
    }
}
