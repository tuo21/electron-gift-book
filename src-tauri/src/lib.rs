mod commands;
mod database;
mod models;
mod license;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            if !data_dir.exists() {
                std::fs::create_dir_all(&data_dir).expect("Failed to create data directory");
            }

            // 初始化自定义数据路径（从配置文件加载）
            let _ = commands::init_custom_data_path(app.handle());

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_all_records,
            commands::get_records_paginated,
            commands::get_record_page,
            commands::get_record_by_id,
            commands::search_records,
            commands::insert_record,
            commands::update_record,
            commands::soft_delete_record,
            commands::restore_deleted_record,
            commands::get_record_history,
            commands::get_all_record_history,
            commands::get_statistics,
            commands::batch_insert_records,
            commands::open_database_file,
            commands::create_new_database,
            commands::update_database_event_date,
            commands::switch_database,
            commands::save_current_database,
            commands::get_recent_databases,
            commands::delete_database,
            commands::open_import_file,
            commands::parse_import_file,
            commands::save_file_dialog,
            commands::generate_pdf,
            commands::get_system_font,
            commands::get_system_fonts_list,
            commands::get_data_path,
            commands::get_default_data_path,
            commands::select_data_folder,
            commands::set_custom_data_path,
            commands::open_path_in_explorer,
            commands::rename_database,
            commands::get_database_theme,
            commands::update_database_theme,
            commands::get_app_config,
            commands::update_app_config,
            commands::reset_app_config,
            commands::get_config_file_path,
            license::get_machine_id,
            license::verify_license,
            license::save_license,
            license::get_license_status,
            license::is_activated,
            license::clear_license,
            commands::get_all_records_by_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
