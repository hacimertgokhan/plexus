use std::process::{Command, Stdio};

#[tauri::command]
fn create_project_command(framework: String) -> Result<String, String> {
    let command = match framework.as_str() {
        "Next" => "npx create-next-app@latest my-next-project",
        "React" => "npx create-react-app my-react-app",
        "Angular" => "npx @angular/cli new my-angular-app",
        "HTML" => "mkdir my-html-project && touch index.html", // HTML project creation
        _ => return Err("Framework not supported".to_string()),
    };

    let output = Command::new("sh")
        .arg("-c")
        .arg(command)
        .stdout(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!("Command failed with status: {:?}", output.status));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
fn open_terminal() -> Result<(), String> {
    // Bu örnek, Linux/Mac terminal açmayı gösteriyor
    #[cfg(target_os = "macos")]
    std::process::Command::new("osascript")
        .arg("-e")
        .arg("tell application \"Terminal\" to do script \"clear\"")
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("gnome-terminal")
        .arg("--")
        .arg("bash")
        .arg("-c")
        .arg("clear; exec bash")
        .output()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_project_command,
            open_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
