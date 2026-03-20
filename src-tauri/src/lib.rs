mod commands;
mod error;
mod models;
mod search;
mod store;

use std::sync::{Arc, Mutex};

use store::file_store::FileStore;
use search::engine::SearchEngine;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let file_store = FileStore::new().expect("Failed to initialize file store");
    file_store.init().expect("Failed to create directory structure");

    let prompts = file_store.list_all_prompts().unwrap_or_default();
    let mut search_engine = SearchEngine::new();
    search_engine.rebuild_index(&prompts);

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Arc::new(Mutex::new(file_store)))
        .manage(Arc::new(Mutex::new(search_engine)))
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
