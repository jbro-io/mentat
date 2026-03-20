mod commands;
mod error;
mod git;
mod models;
mod projects;
mod pty;
mod search;
mod staging;
mod store;

use std::sync::{Arc, Mutex};

use store::file_store::FileStore;
use search::engine::SearchEngine;
use pty::PtyManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let file_store = FileStore::new().expect("Failed to initialize file store");
    file_store.init().expect("Failed to create directory structure");

    // Auto-pull if the repo exists and has a remote (don't fail if offline)
    if git::is_git_repo(&file_store.base_path) {
        if let Ok(status) = git::git_status(&file_store.base_path) {
            if status.has_remote {
                if let Err(e) = git::git_pull(&file_store.base_path) {
                    eprintln!("Auto-pull failed (continuing anyway): {}", e);
                }
            }
        }
    }

    let prompts = file_store.list_all_prompts().unwrap_or_default();
    let mut search_engine = SearchEngine::new();
    search_engine.rebuild_index(&prompts);

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Arc::new(Mutex::new(file_store)))
        .manage(Arc::new(Mutex::new(search_engine)))
        .manage(Arc::new(Mutex::new(PtyManager::new())))
        .invoke_handler(tauri::generate_handler![
            commands::prompts::list_prompts,
            commands::prompts::get_prompt,
            commands::prompts::create_prompt,
            commands::prompts::create_new_prompt,
            commands::prompts::update_prompt,
            commands::prompts::delete_prompt,
            commands::prompts::list_folders,
            commands::prompts::list_tags,
            commands::search::fuzzy_search,
            commands::search::rebuild_search_index,
            commands::clipboard::copy_to_clipboard,
            commands::staging::resolve_prompt,
            commands::staging::export_prompt,
            commands::staging::compose_prompts,
            commands::git::git_sync_status,
            commands::git::git_sync,
            commands::git::git_init,
            commands::git::git_add_remote,
            commands::git::git_get_remote_url,
            commands::projects::list_projects,
            commands::projects::get_project,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::pty::pty_spawn,
            commands::pty::pty_write,
            commands::pty::pty_read_temp,
            commands::pty::pty_resize,
            commands::pty::pty_close,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
