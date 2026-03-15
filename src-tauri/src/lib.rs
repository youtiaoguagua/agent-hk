use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, Runtime,
};
use tokio::sync::oneshot;
use tokio::time::{timeout, Duration};

mod config;
use config::*;

// ================== Hook 结构体 ==================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPayload {
    pub title: String,
    #[serde(rename = "type")]
    pub notification_type: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct HookResponse {
    pub hookSpecificOutput: Option<HookSpecificOutput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct HookSpecificOutput {
    pub hookEventName: String,
    pub permissionDecision: String,
    pub permissionDecisionReason: Option<String>,
}

// ================== 请求日志 ==================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequestLog {
    pub id: String,
    pub timestamp: i64,
    pub hook_event_name: String,
    pub tool_name: Option<String>,
    pub command: Option<String>,
    pub decision: String,
    pub matched: bool,
}

// ================== 应用状态 ==================

pub struct AppState {
    pub config: Mutex<RuleConfig>,
    pub pending_decisions: Mutex<HashMap<String, oneshot::Sender<Option<String>>>>,
    pub request_logs: Mutex<Vec<RequestLog>>,
}

// ================== Tauri 命令 ==================

#[tauri::command]
fn get_config(state: tauri::State<'_, Arc<AppState>>) -> RuleConfig {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn update_config(state: tauri::State<'_, Arc<AppState>>, config: RuleConfig) -> Result<(), String> {
    *state.config.lock().unwrap() = config.clone();
    save_config(&config).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn submit_decision(
    state: tauri::State<'_, Arc<AppState>>,
    request_id: String,
    decision: Option<String>,
) -> Result<(), String> {
    if let Some(tx) = state.pending_decisions.lock().unwrap().remove(&request_id) {
        let _ = tx.send(decision);
    }
    Ok(())
}

// ================== Hook 配置管理 ==================

fn claude_settings_path() -> std::path::PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join(".claude")
        .join("settings.json")
}

#[tauri::command]
fn check_hook_configured() -> Result<bool, String> {
    let settings_path = claude_settings_path();
    if !settings_path.exists() {
        return Ok(false);
    }

    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;

    let settings: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))?;

    if let Some(hooks) = settings.get("hooks") {
        if let Some(pre_tool_use) = hooks.get("PreToolUse") {
            if let Some(hooks_array) = pre_tool_use.as_array() {
                for entry in hooks_array {
                    if let Some(hooks_list) = entry.get("hooks") {
                        if let Some(hooks) = hooks_list.as_array() {
                            for hook in hooks {
                                if let Some(url) = hook.get("url") {
                                    if let Some(url_str) = url.as_str() {
                                        if url_str.contains("127.0.0.1:18080/hook") {
                                            return Ok(true);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(false)
}

#[tauri::command]
fn add_hook_to_claude() -> Result<String, String> {
    let settings_path = claude_settings_path();

    let mut settings: serde_json::Value = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings.json: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings.json: {}", e))?
    } else {
        serde_json::json!({})
    };

    if check_hook_configured()? {
        return Ok("Hook already configured".to_string());
    }

    let new_hook = serde_json::json!({
        "hooks": [
            {
                "type": "http",
                "url": "http://127.0.0.1:18080/hook",
                "timeout": 35
            }
        ]
    });

    if settings.get("hooks").is_none() {
        settings["hooks"] = serde_json::json!({});
    }

    if settings["hooks"].get("PreToolUse").is_none() {
        settings["hooks"]["PreToolUse"] = serde_json::json!([]);
    }

    if let Some(pre_tool_use) = settings["hooks"]["PreToolUse"].as_array_mut() {
        pre_tool_use.insert(0, new_hook);
    }

    std::fs::create_dir_all(settings_path.parent().unwrap())
        .map_err(|e| format!("Failed to create .claude directory: {}", e))?;

    let formatted = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to format JSON: {}", e))?;

    std::fs::write(&settings_path, formatted)
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;

    Ok("Hook configured successfully".to_string())
}

#[tauri::command]
fn remove_hook_from_claude() -> Result<String, String> {
    let settings_path = claude_settings_path();

    if !settings_path.exists() {
        return Ok("No settings.json found".to_string());
    }

    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;

    let mut settings: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))?;

    let mut removed = false;
    if let Some(hooks) = settings.get_mut("hooks") {
        if let Some(pre_tool_use) = hooks.get_mut("PreToolUse") {
            if let Some(hooks_array) = pre_tool_use.as_array_mut() {
                hooks_array.retain(|entry| {
                    if let Some(hooks_list) = entry.get("hooks") {
                        if let Some(hooks) = hooks_list.as_array() {
                            for hook in hooks {
                                if let Some(url) = hook.get("url") {
                                    if let Some(url_str) = url.as_str() {
                                        if url_str.contains("127.0.0.1:18080/hook") {
                                            removed = true;
                                            return false;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    true
                });
            }
        }
    }

    if removed {
        let formatted = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to format JSON: {}", e))?;

        std::fs::write(&settings_path, formatted)
            .map_err(|e| format!("Failed to write settings.json: {}", e))?;

        Ok("Hook removed successfully".to_string())
    } else {
        Ok("Hook not found".to_string())
    }
}

#[tauri::command]
fn get_configured_hooks() -> Result<Vec<String>, String> {
    let settings_path = claude_settings_path();
    if !settings_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;

    let settings: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))?;

    let mut configured = vec![];

    if let Some(hooks) = settings.get("hooks") {
        if let Some(hooks_obj) = hooks.as_object() {
            for (event_name, _) in hooks_obj {
                // 检查该事件是否有我们的 hook URL
                if let Some(event_hooks) = hooks.get(event_name) {
                    if let Some(hooks_array) = event_hooks.as_array() {
                        for entry in hooks_array {
                            if let Some(hooks_list) = entry.get("hooks") {
                                if let Some(hooks) = hooks_list.as_array() {
                                    for hook in hooks {
                                        if let Some(url) = hook.get("url") {
                                            if let Some(url_str) = url.as_str() {
                                                if url_str.contains("127.0.0.1:18080/hook") {
                                                    configured.push(event_name.clone());
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(configured)
}

#[tauri::command]
fn set_hooks(events: Vec<String>) -> Result<String, String> {
    let settings_path = claude_settings_path();

    let mut settings: serde_json::Value = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings.json: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings.json: {}", e))?
    } else {
        serde_json::json!({})
    };

    // 确保 hooks 对象存在
    if settings.get("hooks").is_none() {
        settings["hooks"] = serde_json::json!({});
    }

    // 先收集需要移除的 keys
    let mut keys_to_remove: Vec<String> = vec![];
    if let Some(hooks) = settings.get("hooks") {
        if let Some(hooks_obj) = hooks.as_object() {
            for (key, event_hooks) in hooks_obj {
                if let Some(hooks_array) = event_hooks.as_array() {
                    let has_our_hook = hooks_array.iter().any(|entry| {
                        if let Some(hooks_list) = entry.get("hooks") {
                            if let Some(hooks) = hooks_list.as_array() {
                                return hooks.iter().any(|hook| {
                                    if let Some(url) = hook.get("url") {
                                        if let Some(url_str) = url.as_str() {
                                            return url_str.contains("127.0.0.1:18080/hook");
                                        }
                                    }
                                    false
                                });
                            }
                        }
                        false
                    });
                    if has_our_hook {
                        keys_to_remove.push(key.clone());
                    }
                }
            }
        }
    }

    // 移除已有的 hooks
    if let Some(hooks) = settings.get_mut("hooks") {
        if let Some(hooks_obj) = hooks.as_object_mut() {
            for key in keys_to_remove {
                hooks_obj.remove(&key);
            }
        }
    }

    // 为每个事件添加 hook
    let hook_config = serde_json::json!({
        "hooks": [
            {
                "type": "http",
                "url": "http://127.0.0.1:18080/hook",
                "timeout": 35
            }
        ]
    });

    if let Some(hooks) = settings.get_mut("hooks") {
        for event in &events {
            hooks[&event] = serde_json::json!([hook_config]);
        }
    }

    // 写入文件
    std::fs::create_dir_all(settings_path.parent().unwrap())
        .map_err(|e| format!("Failed to create .claude directory: {}", e))?;

    let formatted = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to format JSON: {}", e))?;

    std::fs::write(&settings_path, formatted)
        .map_err(|e| format!("Failed to write settings.json: {}", e))?;

    Ok(format!("已配置 {} 个事件的 hooks", events.len()))
}

#[tauri::command]
fn remove_all_hooks() -> Result<String, String> {
    let settings_path = claude_settings_path();

    if !settings_path.exists() {
        return Ok("No settings.json found".to_string());
    }

    let content = std::fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings.json: {}", e))?;

    let mut settings: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings.json: {}", e))?;

    // 先收集需要移除的 keys
    let mut keys_to_remove: Vec<String> = vec![];
    if let Some(hooks) = settings.get("hooks") {
        if let Some(hooks_obj) = hooks.as_object() {
            for (key, event_hooks) in hooks_obj {
                if let Some(hooks_array) = event_hooks.as_array() {
                    let has_our_hook = hooks_array.iter().any(|entry| {
                        if let Some(hooks_list) = entry.get("hooks") {
                            if let Some(hooks) = hooks_list.as_array() {
                                return hooks.iter().any(|hook| {
                                    if let Some(url) = hook.get("url") {
                                        if let Some(url_str) = url.as_str() {
                                            return url_str.contains("127.0.0.1:18080/hook");
                                        }
                                    }
                                    false
                                });
                            }
                        }
                        false
                    });
                    if has_our_hook {
                        keys_to_remove.push(key.clone());
                    }
                }
            }
        }
    }

    let removed_count = keys_to_remove.len();

    if removed_count > 0 {
        if let Some(hooks) = settings.get_mut("hooks") {
            if let Some(hooks_obj) = hooks.as_object_mut() {
                for key in keys_to_remove {
                    hooks_obj.remove(&key);
                }
            }
        }

        let formatted = serde_json::to_string_pretty(&settings)
            .map_err(|e| format!("Failed to format JSON: {}", e))?;

        std::fs::write(&settings_path, formatted)
            .map_err(|e| format!("Failed to write settings.json: {}", e))?;

        Ok(format!("已移除 {} 个事件的 hooks", removed_count))
    } else {
        Ok("未找到配置".to_string())
    }
}

#[tauri::command]
fn get_request_logs(state: tauri::State<'_, Arc<AppState>>) -> Vec<RequestLog> {
    state.request_logs.lock().unwrap().clone()
}

#[tauri::command]
fn clear_request_logs(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    state.request_logs.lock().unwrap().clear();
    Ok(())
}

#[tauri::command]
fn hide_notification_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("notification") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn position_notification_window(
    app: AppHandle,
    screen_index: usize,
    position_preset: String,
    offset_x: i32,
    offset_y: i32,
) -> Result<(), String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    if let Some(monitor) = monitors.get(screen_index) {
        let window = app
            .get_webview_window("notification")
            .ok_or("Notification window not found")?;

        let size = monitor.size();
        let pos = monitor.position();
        let window_size = window.outer_size().map_err(|e| e.to_string())?;
        let window_height = 150; // 估计高度

        // 根据预设位置计算坐标
        let (pos_x, pos_y) = match position_preset.as_str() {
            "top_left" | "left_center" => {
                (pos.x + offset_x, pos.y + offset_y)
            }
            "top_center" => {
                (pos.x + (size.width as i32 - window_size.width as i32) / 2 + offset_x, pos.y + offset_y)
            }
            "top_right" | "right_center" => {
                (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + offset_y)
            }
            "bottom_left" => {
                (pos.x + offset_x, pos.y + size.height as i32 - window_height - offset_y)
            }
            "bottom_center" => {
                (pos.x + (size.width as i32 - window_size.width as i32) / 2 + offset_x, pos.y + size.height as i32 - window_height - offset_y)
            }
            "bottom_right" => {
                (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + size.height as i32 - window_height - offset_y)
            }
            _ => {
                // 默认右上角
                (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + offset_y)
            }
        };

        window
            .set_position(tauri::PhysicalPosition::new(pos_x, pos_y))
            .map_err(|e| e.to_string())?;

        log::info!(
            "[Backend] Notification window positioned on screen {} at ({}, {})",
            screen_index,
            pos_x,
            pos_y
        );
    }

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub index: usize,
    pub name: String,
    pub is_primary: bool,
    pub size: (u32, u32),
    pub position: (i32, i32),
}

#[tauri::command]
async fn get_available_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    let monitor_info: Vec<MonitorInfo> = monitors
        .into_iter()
        .enumerate()
        .map(|(index, monitor)| {
            let size = monitor.size();
            let position = monitor.position();
            MonitorInfo {
                index,
                name: format!("屏幕 {}", index + 1),
                is_primary: index == 0,
                size: (size.width, size.height),
                position: (position.x, position.y),
            }
        })
        .collect();

    Ok(monitor_info)
}

#[tauri::command]
async fn show_test_notification(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("notification") {
        // 先定位窗口
        let config = state.config.lock().unwrap().clone();
        let settings = config.notification_settings;

        let ScreenSelection::ScreenIndex { index } = settings.screen;
            let monitors = app.available_monitors().map_err(|e| e.to_string())?;
            if let Some(monitor) = monitors.get(index) {
                let size = monitor.size();
                let pos = monitor.position();
                let window_size = window.outer_size().map_err(|e| e.to_string())?;
                let window_height = 150;

                let preset = format!("{:?}", settings.position.preset).to_lowercase();
                let offset_x = settings.position.offset_x;
                let offset_y = settings.position.offset_y;

                let (pos_x, pos_y) = match preset.as_str() {
                    "topleft" | "leftcenter" => {
                        (pos.x + offset_x, pos.y + offset_y)
                    }
                    "topcenter" => {
                        (pos.x + (size.width as i32 - window_size.width as i32) / 2 + offset_x, pos.y + offset_y)
                    }
                    "topright" | "rightcenter" => {
                        (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + offset_y)
                    }
                    "bottomleft" => {
                        (pos.x + offset_x, pos.y + size.height as i32 - window_height - offset_y)
                    }
                    "bottomcenter" => {
                        (pos.x + (size.width as i32 - window_size.width as i32) / 2 + offset_x, pos.y + size.height as i32 - window_height - offset_y)
                    }
                    "bottomright" => {
                        (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + size.height as i32 - window_height - offset_y)
                    }
                    _ => {
                        (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + offset_y)
                    }
                };

                let _ = window.set_position(tauri::PhysicalPosition::new(pos_x, pos_y));
            }

        let _ = window.show();
        let _ = window.set_ignore_cursor_events(false);

        let payload = serde_json::json!({
            "type": "hook",
            "action": "notify",
            "requestId": format!("test-{}", uuid::Uuid::new_v4()),
            "hookEventName": "TestNotification",
            "eventData": {
                "tool_name": "Test",
                "tool_input": {
                    "command": "这是一条测试通知"
                }
            },
        });

        app.emit("show-notification", payload)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ================== HTTP Handler ==================

fn start_http_server<R: Runtime>(app: AppHandle<R>, state: Arc<AppState>) {
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
        rt.block_on(async {
            let app_clone = app.clone();
            let state_clone = state.clone();
            actix_web::HttpServer::new(move || {
                let app_inner = app_clone.clone();
                let state_inner = state_clone.clone();
                actix_web::App::new()
                    .app_data(actix_web::web::Data::new(app_inner))
                    .app_data(actix_web::web::Data::new(state_inner))
                    .route("/hook", actix_web::web::post().to(hook_handler))
            })
            .bind("127.0.0.1:18080")
            .expect("Failed to bind HTTP server to port 18080")
            .run()
            .await
            .expect("HTTP server error");
        });
    });
}

async fn hook_handler(
    app: actix_web::web::Data<AppHandle>,
    state: actix_web::web::Data<Arc<AppState>>,
    body: actix_web::web::Json<serde_json::Value>,
) -> actix_web::HttpResponse {
    let config = state.config.lock().unwrap().clone();
    let request_id = uuid::Uuid::new_v4().to_string();
    let hook_event_name = body["hook_event_name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();
    let tool_name = body["tool_name"].as_str().map(String::from);
    let command = body["tool_input"]["command"].as_str().map(String::from);

    log::info!(
        "[HTTP] Hook request: {} - {} - {}",
        hook_event_name,
        request_id,
        serde_json::to_string_pretty(&*body).unwrap_or_else(|_| "{}".to_string())
    );

    match hook_event_name.as_str() {
        "PreToolUse" => {
            handle_pretooluse(
                app,
                state,
                &config,
                request_id,
                hook_event_name,
                tool_name,
                command,
                body,
            )
            .await
        }
        "PermissionRequest" => {
            handle_permission_request(
                app,
                state,
                request_id,
                hook_event_name,
                tool_name,
                command,
                body,
            )
            .await
        }
        _ => {
            handle_other_event(
                app,
                state,
                &config,
                request_id,
                hook_event_name,
                tool_name,
                command,
                body,
            )
            .await
        }
    }
}

// 处理 PreToolUse 事件
async fn handle_pretooluse(
    app: actix_web::web::Data<AppHandle>,
    state: actix_web::web::Data<Arc<AppState>>,
    config: &RuleConfig,
    request_id: String,
    hook_event_name: String,
    tool_name: Option<String>,
    command: Option<String>,
    body: actix_web::web::Json<serde_json::Value>,
) -> actix_web::HttpResponse {
    let pretooluse_config = &config.pretooluse;

    match pretooluse_config.level {
        NotificationLevel::Silent => {
            log::info!("[HTTP] PreToolUse: silent mode, auto-allow");
            record_log(
                &state,
                &request_id,
                &hook_event_name,
                &tool_name,
                &command,
                "allow",
                false,
            );
            actix_web::HttpResponse::Ok().json(HookResponse {
                hookSpecificOutput: None, // hookSpecificOutput: Some(HookSpecificOutput {
                                          //     hookEventName: hook_event_name.clone(),
                                          //     permissionDecision: "allow".to_string(),
                                          //     permissionDecisionReason: Some("Silent mode".to_string()),
                                          // }),
            })
        }
        NotificationLevel::Notify => {
            log::info!("[HTTP] PreToolUse: notify mode, waiting for user decision");
            emit_hook_notification(
                app,
                state,
                request_id,
                hook_event_name,
                tool_name,
                command,
                body,
                "decide",
            )
            .await
        }
        NotificationLevel::Conditional => {
            match find_matching_pretooluse_row(pretooluse_config, &body) {
                None => {
                    log::info!("[HTTP] PreToolUse: no matching rule, auto-allow");
                    record_log(
                        &state,
                        &request_id,
                        &hook_event_name,
                        &tool_name,
                        &command,
                        "allow",
                        false,
                    );
                    // actix_web::HttpResponse::Ok().json(HookResponse {
                    //      hookSpecificOutput: None
                    //     // hookSpecificOutput: Some(HookSpecificOutput {
                    //     //     hookEventName: hook_event_name.clone(),
                    //     //     permissionDecision: "allow".to_string(),
                    //     //     permissionDecisionReason: Some("No matching rule".to_string()),
                    //     // }),
                    // })
                    // 仅返回 200 OK，无响应体
                    actix_web::HttpResponse::Ok().finish()
                }
                Some(row) => {
                    // 如果 notify 为 false，静默处理
                    if !row.notify {
                        let decision = match row.on_match {
                            MatchBehavior::AutoDeny => "deny",
                            _ => "allow",
                        };
                        log::info!(
                            "[HTTP] PreToolUse: matched rule {}, notify disabled, auto-{} (silent)",
                            row.id,
                            decision
                        );
                        record_log(
                            &state,
                            &request_id,
                            &hook_event_name,
                            &tool_name,
                            &command,
                            decision,
                            true,
                        );
                        return actix_web::HttpResponse::Ok().json(HookResponse {
                            hookSpecificOutput: Some(HookSpecificOutput {
                                hookEventName: hook_event_name.clone(),
                                permissionDecision: decision.to_string(),
                                permissionDecisionReason: Some("Notify disabled".to_string()),
                            }),
                        });
                    }

                    match row.on_match {
                        MatchBehavior::ManualConfirm => {
                            log::info!(
                                "[HTTP] PreToolUse: matched rule {}, manual confirm",
                                row.id
                            );
                            emit_hook_notification(
                                app,
                                state,
                                request_id,
                                hook_event_name,
                                tool_name,
                                command,
                                body,
                                "decide",
                            )
                            .await
                        }
                        MatchBehavior::AutoAllow => {
                            log::info!(
                                "[HTTP] PreToolUse: matched rule {}, auto-allow (notify)",
                                row.id
                            );
                            emit_hook_notification(
                                app,
                                state,
                                request_id,
                                hook_event_name,
                                tool_name,
                                command,
                                body,
                                "notify",
                            )
                            .await
                        }
                        MatchBehavior::AutoDeny => {
                            log::info!(
                                "[HTTP] PreToolUse: matched rule {}, auto-deny (notify)",
                                row.id
                            );
                            emit_hook_notification(
                                app,
                                state,
                                request_id,
                                hook_event_name,
                                tool_name,
                                command,
                                body,
                                "notify",
                            )
                            .await
                        }
                        MatchBehavior::NotifyOnly => {
                            log::info!("[HTTP] PreToolUse: matched rule {}, notify only", row.id);
                            // 发送通知但不等待用户决策，直接返回 allow

                            // 获取配置
                            let config = state.config.lock().unwrap().clone();
                            let settings = config.notification_settings;

                            if let Some(window) = app.get_webview_window("notification") {
                                // 根据配置定位窗口
                                let ScreenSelection::ScreenIndex { index } = settings.screen;
                                    let monitors = app.available_monitors();
                                    if let Ok(monitors) = monitors {
                                        if let Some(monitor) = monitors.get(index) {
                                            let size = monitor.size();
                                            let pos = monitor.position();
                                            let window_size = window
                                                .outer_size()
                                                .unwrap_or(tauri::PhysicalSize::new(420, 300));
                                            let window_height = 150;

                                            let preset = format!("{:?}", settings.position.preset)
                                                .to_lowercase();
                                            let offset_x = settings.position.offset_x;
                                            let offset_y = settings.position.offset_y;

                                            let (pos_x, pos_y) = match preset.as_str() {
                                                "topleft" | "leftcenter" => {
                                                    (pos.x + offset_x, pos.y + offset_y)
                                                }
                                                "topcenter" => {
                                                    (pos.x + (size.width as i32 - window_size.width as i32) / 2 + offset_x, pos.y + offset_y)
                                                }
                                                "topright" | "rightcenter" => {
                                                    (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + offset_y)
                                                }
                                                "bottomleft" => {
                                                    (pos.x + offset_x, pos.y + size.height as i32 - window_height - offset_y)
                                                }
                                                "bottomcenter" => {
                                                    (pos.x + (size.width as i32 - window_size.width as i32) / 2 + offset_x, pos.y + size.height as i32 - window_height - offset_y)
                                                }
                                                "bottomright" => {
                                                    (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + size.height as i32 - window_height - offset_y)
                                                }
                                                _ => {
                                                    (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + offset_y)
                                                }
                                            };

                                            let _ = window.set_position(
                                                tauri::PhysicalPosition::new(pos_x, pos_y),
                                            );
                                        }
                                    }

                                let _ = window.show();
                                let _ = window.set_ignore_cursor_events(false);
                            }

                            let payload = serde_json::json!({
                                "type": "hook",
                                "action": "notify",
                                "requestId": request_id,
                                "hookEventName": hook_event_name,
                                "eventData": body,
                            });

                            if let Err(e) = app.emit("show-notification", payload) {
                                log::error!("[HTTP] Failed to emit notification: {}", e);
                            }

                            record_log(
                                &state,
                                &request_id,
                                &hook_event_name,
                                &tool_name,
                                &command,
                                "allow",
                                true,
                            );
                            actix_web::HttpResponse::Ok().json(HookResponse {
                                hookSpecificOutput: Some(HookSpecificOutput {
                                    hookEventName: hook_event_name.clone(),
                                    permissionDecision: "allow".to_string(),
                                    permissionDecisionReason: Some("Notify only".to_string()),
                                }),
                            })
                        }
                    }
                }
            }
        }
    }
}

// 查找匹配的 PreToolUse 规则行
fn find_matching_pretooluse_row<'a>(
    config: &'a PreToolUseConfig,
    event_data: &serde_json::Value,
) -> Option<&'a PreToolUseRuleRow> {
    let tool_name = event_data["tool_name"].as_str().unwrap_or("");
    let command = event_data["tool_input"]["command"].as_str().unwrap_or("");

    config.rule_rows.iter().find(|row| {
        if !row.enabled {
            return false;
        }

        let tool_match = if row.tool_names.is_empty() {
            false
        } else {
            row.tool_names.iter().any(|name| name == tool_name)
        };

        let content_match = if row.content_patterns.is_empty() {
            false
        } else {
            row.content_patterns
                .iter()
                .any(|pattern| command.contains(pattern))
        };

        tool_match || content_match
    })
}

// 处理 PermissionRequest 事件
async fn handle_permission_request(
    app: actix_web::web::Data<AppHandle>,
    state: actix_web::web::Data<Arc<AppState>>,
    request_id: String,
    hook_event_name: String,
    tool_name: Option<String>,
    command: Option<String>,
    body: actix_web::web::Json<serde_json::Value>,
) -> actix_web::HttpResponse {
    log::info!("[HTTP] PermissionRequest: always waiting for user decision");
    emit_hook_notification(
        app,
        state,
        request_id,
        hook_event_name,
        tool_name,
        command,
        body,
        "decide",
    )
    .await
}

// 处理其他事件
async fn handle_other_event(
    app: actix_web::web::Data<AppHandle>,
    state: actix_web::web::Data<Arc<AppState>>,
    config: &RuleConfig,
    request_id: String,
    hook_event_name: String,
    tool_name: Option<String>,
    command: Option<String>,
    body: actix_web::web::Json<serde_json::Value>,
) -> actix_web::HttpResponse {
    let event_config = config.other_events.get(&hook_event_name);

    match event_config {
        None => {
            record_log(
                &state,
                &request_id,
                &hook_event_name,
                &tool_name,
                &command,
                "allow",
                false,
            );
            actix_web::HttpResponse::Ok().json(HookResponse {
                hookSpecificOutput: Some(HookSpecificOutput {
                    hookEventName: hook_event_name.clone(),
                    permissionDecision: "allow".to_string(),
                    permissionDecisionReason: Some("No config".to_string()),
                }),
            })
        }
        Some(cfg) => match cfg.level {
            NotificationLevel::Silent => {
                record_log(
                    &state,
                    &request_id,
                    &hook_event_name,
                    &tool_name,
                    &command,
                    "allow",
                    false,
                );
                actix_web::HttpResponse::Ok().json(HookResponse {
                    hookSpecificOutput: Some(HookSpecificOutput {
                        hookEventName: hook_event_name.clone(),
                        permissionDecision: "allow".to_string(),
                        permissionDecisionReason: Some("Silent mode".to_string()),
                    }),
                })
            }
            NotificationLevel::Notify => {
                emit_hook_notification(
                    app,
                    state,
                    request_id,
                    hook_event_name,
                    tool_name,
                    command,
                    body,
                    "notify",
                )
                .await
            }
            NotificationLevel::Conditional => match find_matching_other_event_row(cfg, &body) {
                None => {
                    record_log(
                        &state,
                        &request_id,
                        &hook_event_name,
                        &tool_name,
                        &command,
                        "allow",
                        false,
                    );
                    actix_web::HttpResponse::Ok().json(HookResponse {
                        hookSpecificOutput: Some(HookSpecificOutput {
                            hookEventName: hook_event_name.clone(),
                            permissionDecision: "allow".to_string(),
                            permissionDecisionReason: Some("No matching rule".to_string()),
                        }),
                    })
                }
                Some(_) => {
                    emit_hook_notification(
                        app,
                        state,
                        request_id,
                        hook_event_name,
                        tool_name,
                        command,
                        body,
                        "notify",
                    )
                    .await
                }
            },
        },
    }
}

// 查找匹配的其他事件规则行
fn find_matching_other_event_row<'a>(
    config: &'a OtherEventConfig,
    event_data: &serde_json::Value,
) -> Option<&'a OtherEventRuleRow> {
    let tool_name = event_data["tool_name"].as_str().unwrap_or("");
    let command = event_data["tool_input"]["command"].as_str().unwrap_or("");

    config.rule_rows.iter().find(|row| {
        if !row.enabled {
            return false;
        }

        let tool_match = if row.tool_names.is_empty() {
            true
        } else {
            row.tool_names.iter().any(|name| name == tool_name)
        };

        let content_match = if row.content_patterns.is_empty() {
            true
        } else {
            row.content_patterns
                .iter()
                .any(|pattern| command.contains(pattern))
        };

        tool_match || content_match
    })
}

// ================== Webhook 转发 ==================

fn render_webhook_body(
    template: &str,
    event: &str,
    tool: &str,
    command: &str,
    action: &str,
) -> String {
    template
        .replace("{{event}}", event)
        .replace("{{tool}}", tool)
        .replace("{{command}}", command)
        .replace("{{action}}", action)
}

async fn send_webhook(
    state: &Arc<AppState>,
    hook_event_name: &str,
    tool_name: &Option<String>,
    command: &Option<String>,
    action: &str,
) {
    let config = state.config.lock().unwrap().clone();
    let webhook = &config.webhook_settings;
    if !webhook.enabled || webhook.url.is_empty() || webhook.body.is_empty() {
        return;
    }

    let tool = tool_name.as_deref().unwrap_or("");
    let cmd = command.as_deref().unwrap_or("");
    let cmd_display = if cmd.len() > 200 { &cmd[..200] } else { cmd };
    let body_str = render_webhook_body(&webhook.body, hook_event_name, tool, cmd_display, action);

    let url = webhook.url.clone();
    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let result = match serde_json::from_str::<serde_json::Value>(&body_str) {
            Ok(json) => client.post(&url).json(&json).send().await,
            Err(_) => client.post(&url).body(body_str).header("Content-Type", "application/json").send().await,
        };
        if let Err(e) = result {
            log::error!("[Webhook] Failed to send: {}", e);
        }
    });
}

#[tauri::command]
async fn test_webhook(state: tauri::State<'_, Arc<AppState>>) -> Result<String, String> {
    let config = state.config.lock().unwrap().clone();
    let webhook = &config.webhook_settings;
    if webhook.url.is_empty() {
        return Err("Webhook URL 为空".to_string());
    }

    let body_str = render_webhook_body(
        &webhook.body,
        "TestNotification",
        "Test",
        "这是一条测试消息",
        "notify",
    );

    let client = reqwest::Client::new();
    let resp = match serde_json::from_str::<serde_json::Value>(&body_str) {
        Ok(json) => client.post(&webhook.url).json(&json).send().await,
        Err(_) => client.post(&webhook.url).body(body_str).header("Content-Type", "application/json").send().await,
    }.map_err(|e| format!("发送失败: {}", e))?;

    if resp.status().is_success() {
        Ok("发送成功".to_string())
    } else {
        Err(format!("服务端返回错误: {}", resp.status()))
    }
}

// 发送 hook 通知，通过 action 参数区分是否需要用户交互
// action: "notify" - 仅显示通知，自动返回 allow
// action: "decide" - 显示通知并等待用户决定 (显示 Accept/Deny 按钮)
async fn emit_hook_notification(
    app: actix_web::web::Data<AppHandle>,
    state: actix_web::web::Data<Arc<AppState>>,
    request_id: String,
    hook_event_name: String,
    tool_name: Option<String>,
    command: Option<String>,
    body: actix_web::web::Json<serde_json::Value>,
    action: &str,
) -> actix_web::HttpResponse {
    // 获取配置
    let config = state.config.lock().unwrap().clone();
    let settings = config.notification_settings;

    // 显示通知窗口并定位
    if let Some(window) = app.get_webview_window("notification") {
        // 根据配置定位窗口
        let ScreenSelection::ScreenIndex { index } = settings.screen;
            let monitors = app.available_monitors();
            if let Ok(monitors) = monitors {
                if let Some(monitor) = monitors.get(index) {
                    let size = monitor.size();
                    let pos = monitor.position();
                    let window_size = window
                        .outer_size()
                        .unwrap_or(tauri::PhysicalSize::new(420, 300));
                    let window_height = 150;

                    let preset = format!("{:?}", settings.position.preset).to_lowercase();
                    let offset_x = settings.position.offset_x;
                    let offset_y = settings.position.offset_y;

                    let (pos_x, pos_y) = match preset.as_str() {
                        "topleft" | "leftcenter" => {
                            (pos.x + offset_x, pos.y + offset_y)
                        }
                        "topcenter" => {
                            (pos.x + (size.width as i32 - window_size.width as i32) / 2 + offset_x, pos.y + offset_y)
                        }
                        "topright" | "rightcenter" => {
                            (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + offset_y)
                        }
                        "bottomleft" => {
                            (pos.x + offset_x, pos.y + size.height as i32 - window_height - offset_y)
                        }
                        "bottomcenter" => {
                            (pos.x + (size.width as i32 - window_size.width as i32) / 2 + offset_x, pos.y + size.height as i32 - window_height - offset_y)
                        }
                        "bottomright" => {
                            (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + size.height as i32 - window_height - offset_y)
                        }
                        _ => {
                            (pos.x + size.width as i32 - window_size.width as i32 - offset_x, pos.y + offset_y)
                        }
                    };

                    let _ = window.set_position(tauri::PhysicalPosition::new(pos_x, pos_y));
                }
            }

        let _ = window.show();
        let _ = window.set_ignore_cursor_events(false);
    }

    let payload = serde_json::json!({
        "type": "hook",
        "action": action,
        "requestId": request_id,
        "hookEventName": hook_event_name,
        "eventData": body,
    });

    if let Err(e) = app.emit("show-notification", payload) {
        log::error!("[HTTP] Failed to emit notification: {}", e);
        return actix_web::HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }));
    }

    // 转发到 webhook
    send_webhook(&state, &hook_event_name, &tool_name, &command, action).await;

    // 如果不需要用户交互，直接返回 allow
    if action == "notify" {
        record_log(
            &state,
            &request_id,
            &hook_event_name,
            &tool_name,
            &command,
            "allow",
            true,
        );
        return actix_web::HttpResponse::Ok().json(HookResponse {
            hookSpecificOutput: Some(HookSpecificOutput {
                hookEventName: hook_event_name.clone(),
                permissionDecision: "allow".to_string(),
                permissionDecisionReason: Some("Notification only".to_string()),
            }),
        });
    }

    // 等待用户决定
    let (tx, rx) = oneshot::channel::<Option<String>>();
    state
        .pending_decisions
        .lock()
        .unwrap()
        .insert(request_id.clone(), tx);

    let decision = match timeout(Duration::from_secs(30), rx).await {
        Ok(Ok(d)) => d,
        _ => {
            log::warn!("[HTTP] Decision timeout");
            Some("ask".to_string())
        }
    };

    state.pending_decisions.lock().unwrap().remove(&request_id);

    // 如果用户取消（decision 为 None），返回空响应
    let decision_str = match decision {
        Some(d) => {
            log::info!("[HTTP] Decision: {}", d);
            d
        }
        None => {
            log::info!("[HTTP] Decision cancelled by user");
            return actix_web::HttpResponse::Ok().finish();
        }
    };

    record_log(
        &state,
        &request_id,
        &hook_event_name,
        &tool_name,
        &command,
        &decision_str,
        true,
    );

    actix_web::HttpResponse::Ok().json(HookResponse {
        hookSpecificOutput: Some(HookSpecificOutput {
            hookEventName: hook_event_name.clone(),
            permissionDecision: decision_str,
            permissionDecisionReason: Some("User decision via notification".to_string()),
        }),
    })
}

// 记录日志
fn record_log(
    state: &Arc<AppState>,
    request_id: &str,
    hook_event_name: &str,
    tool_name: &Option<String>,
    command: &Option<String>,
    decision: &str,
    matched: bool,
) {
    let log_entry = RequestLog {
        id: request_id.to_string(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64,
        hook_event_name: hook_event_name.to_string(),
        tool_name: tool_name.clone(),
        command: command.clone(),
        decision: decision.to_string(),
        matched,
    };

    let mut logs = state.request_logs.lock().unwrap();
    logs.insert(0, log_entry);
    if logs.len() > 100 {
        logs.truncate(100);
    }
}

// ================== 托盘菜单 ==================

fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                if button == tauri::tray::MouseButton::Left {
                    // 左键点击：直接打开设置窗口
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

// ================== 主函数 ==================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = load_config().unwrap_or_default();
    let start_hidden = config.general_settings.start_hidden;

    let shared_state = Arc::new(AppState {
        config: Mutex::new(config),
        pending_decisions: Mutex::new(HashMap::new()),
        request_logs: Mutex::new(Vec::new()),
    });

    let close_state = shared_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .level(tauri_plugin_log::log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(shared_state.clone())
        .invoke_handler(tauri::generate_handler![
            hide_notification_window,
            get_config,
            update_config,
            submit_decision,
            check_hook_configured,
            add_hook_to_claude,
            remove_hook_from_claude,
            get_request_logs,
            clear_request_logs,
            get_configured_hooks,
            set_hooks,
            remove_all_hooks,
            get_available_monitors,
            show_test_notification,
            position_notification_window,
            test_webhook,
        ])
        .on_window_event(move |window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let close_to_tray = close_state.config.lock().unwrap().general_settings.close_to_tray;
                    if close_to_tray {
                        api.prevent_close();
                        let _ = window.hide();
                    } else {
                        api.prevent_close();
                        window.app_handle().exit(0);
                    }
                }
            }
        })
        .setup(move |app| {
            // 启动后隐藏到托盘
            if start_hidden {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.hide();
                }
            }

            setup_tray(app.handle()).expect("Failed to setup tray");
            start_http_server(app.handle().clone(), shared_state);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
