use std::process::{Command, Stdio};
use std::path::Path;
use std::fs;

// ─── TERMINAL ─────────────────────────────────────────────────
#[tauri::command]
fn run_command(command: String, cwd: Option<String>) -> Result<String, String> {
    let mut cmd = Command::new("sh");
    cmd.arg("-c").arg(&command);
    if let Some(ref c) = cwd {
        if !c.is_empty() {
            cmd.current_dir(c);
        }
    }
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let output = cmd.output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if stdout.is_empty() && !stderr.is_empty() {
        Ok(stderr)
    } else {
        Ok(format!("{}{}", stdout, stderr))
    }
}

// ─── GIT ──────────────────────────────────────────────────────
#[tauri::command]
fn git_command(path: String, args: Vec<String>) -> Result<String, String> {
    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok(format!("{}{}", stdout, stderr))
}

// ─── BACKUP ───────────────────────────────────────────────────
fn copy_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    const EXCLUDE: &[&str] = &[
        ".git", "node_modules", ".next", ".nuxt", "dist", "build",
        "target", ".cache", "__pycache__", ".venv", "venv",
        ".tox", "coverage", ".turbo",
    ];

    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if EXCLUDE.iter().any(|ex| *ex == name_str.as_ref()) {
            continue;
        }
        let dest_path = dst.join(&name);
        let ft = entry.file_type()?;
        if ft.is_dir() {
            copy_dir(&entry.path(), &dest_path)?;
        } else if ft.is_file() {
            fs::copy(entry.path(), &dest_path)?;
        }
    }
    Ok(())
}

#[tauri::command]
fn create_backup(source: String, dest: String) -> Result<String, String> {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let src = Path::new(&source);
    let folder_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("backup");

    let backup_dir = Path::new(&dest).join(format!("{}-{}", folder_name, ts));
    copy_dir(src, &backup_dir).map_err(|e| e.to_string())?;

    Ok(backup_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn list_backups(path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(vec![]);
    }
    let mut backups: Vec<String> = fs::read_dir(p)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.path().to_string_lossy().to_string())
        .collect();
    backups.sort_by(|a, b| b.cmp(a));
    Ok(backups)
}

// ─── PROJECT DETECTION ────────────────────────────────────────
#[tauri::command]
fn read_package_json(folder: String) -> Result<String, String> {
    let pkg_path = Path::new(&folder).join("package.json");
    if !pkg_path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&pkg_path).map_err(|e| e.to_string())
}

// ─── SPOTIFY PKCE OAUTH SERVER ────────────────────────────────
#[tauri::command]
async fn start_spotify_oauth_server() -> Result<String, String> {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;

    let listener = TcpListener::bind("127.0.0.1:8765")
        .map_err(|e| format!("Could not bind port 8765: {}", e))?;

    let (mut stream, _) = listener.accept().map_err(|e| e.to_string())?;

    let mut reader = BufReader::new(&stream);
    let mut request_line = String::new();
    reader.read_line(&mut request_line).map_err(|e| e.to_string())?;

    // GET /callback?code=xxx&state=yyy HTTP/1.1
    let code = request_line
        .split_whitespace()
        .nth(1) // path
        .and_then(|path| path.split('?').nth(1))
        .and_then(|query| {
            query.split('&')
                .find(|p| p.starts_with("code="))
                .map(|p| p[5..].to_string())
        })
        .ok_or_else(|| "No authorization code in callback".to_string())?;

    let html = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n\
        <!DOCTYPE html><html><body style='font-family:sans-serif;text-align:center;padding:60px'>\
        <h2 style='color:#1DB954'>Spotify connected!</h2>\
        <p>You can close this tab and return to Plexus.</p>\
        </body></html>";
    let _ = stream.write_all(html.as_bytes());

    Ok(code)
}

// ─── TERMINAL WITH COMMAND ────────────────────────────────────
#[tauri::command]
fn run_command_in_terminal(command: String, cwd: Option<String>) -> Result<(), String> {
    let dir = cwd.unwrap_or_else(|| String::from("~"));

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "tell application \"Terminal\" to do script \"cd '{}' && {}\"",
            dir.replace('\'', "'\\''"),
            command.replace('\"', "\\\"")
        );
        std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let script = format!("cd '{}' && {}; exec bash", dir.replace('\'', "'\\''"), command);
        let _ = std::process::Command::new("x-terminal-emulator")
            .args(&["--", "bash", "-c", &script])
            .spawn()
            .or_else(|_| std::process::Command::new("gnome-terminal").args(&["--", "bash", "-c", &script]).spawn())
            .or_else(|_| std::process::Command::new("xterm").args(&["-e", &script]).spawn())
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        let script = format!("cd /d \"{}\" && {}", dir, command);
        std::process::Command::new("cmd")
            .args(&["/c", "start", "cmd", "/k", &script])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ─── TERMINAL OPENER ──────────────────────────────────────────
#[tauri::command]
fn open_terminal() -> Result<(), String> {
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

    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .arg("/c")
        .arg("start")
        .arg("cmd")
        .output()
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ─── LEGACY ───────────────────────────────────────────────────
#[tauri::command]
fn create_project_command(framework: String) -> Result<String, String> {
    let command = match framework.as_str() {
        "Next" => "npx create-next-app@latest my-next-project",
        "React" => "npx create-react-app my-react-app",
        "Angular" => "npx @angular/cli new my-angular-app",
        "HTML" => "mkdir my-html-project && touch my-html-project/index.html",
        "Vue" => "npm create vue@latest my-vue-project",
        "Svelte" => "npm create svelte@latest my-svelte-project",
        _ => return Err("Framework not supported".to_string()),
    };

    let output = Command::new("sh")
        .arg("-c")
        .arg(command)
        .stdout(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// ─── APP ENTRY ────────────────────────────────────────────────
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
            open_terminal,
            run_command,
            run_command_in_terminal,
            start_spotify_oauth_server,
            git_command,
            create_backup,
            list_backups,
            read_package_json,
            create_project_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
