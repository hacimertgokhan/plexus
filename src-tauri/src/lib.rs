use std::process::Command;
use std::path::Path;
use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Stdio;

#[tauri::command]
fn create_project_command(framework: String) -> Result<String, String> {
    let command = match framework.as_str() {
        "Next" => "npx create-next-app@latest my-next-project",
        "React" => "npx create-react-app my-react-app",
        "Angular" => "npx @angular/cli new my-angular-app",
        _ => return Err("Framework not supported".to_string()),
    };

    let output = Command::new("sh")
        .arg("-c")
        .arg(command) // Komutu burada çalıştırıyoruz
        .stdout(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!("Command failed with status: {:?}", output.status));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_project_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
