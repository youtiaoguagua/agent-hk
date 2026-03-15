use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

// ==================== 通知级别 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NotificationLevel {
    Notify,
    Silent,
    Conditional,
}

// ==================== 匹配后行为 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MatchBehavior {
    ManualConfirm,
    AutoAllow,
    AutoDeny,
    NotifyOnly,
}

// ==================== PreToolUse 规则行 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreToolUseRuleRow {
    pub id: String,
    pub enabled: bool,
    pub tool_names: Vec<String>,       // 空表示匹配所有工具
    pub content_patterns: Vec<String>, // 空表示匹配所有内容
    pub notify: bool,                  // 是否通知，默认否
    pub on_match: MatchBehavior,
}

// ==================== PreToolUse 配置 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreToolUseConfig {
    pub level: NotificationLevel,
    pub rule_rows: Vec<PreToolUseRuleRow>,
}

impl Default for PreToolUseConfig {
    fn default() -> Self {
        Self {
            level: NotificationLevel::Conditional,
            rule_rows: vec![],
        }
    }
}

// ==================== PermissionRequest 配置 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionRequestConfig {
    pub fixed: bool,
}

impl Default for PermissionRequestConfig {
    fn default() -> Self {
        Self { fixed: true }
    }
}

// ==================== 其他事件规则行 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OtherEventRuleRow {
    pub id: String,
    pub enabled: bool,
    pub tool_names: Vec<String>,
    pub content_patterns: Vec<String>,
}

// ==================== 其他事件配置 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OtherEventConfig {
    pub level: NotificationLevel,
    pub rule_rows: Vec<OtherEventRuleRow>,
}

impl Default for OtherEventConfig {
    fn default() -> Self {
        Self {
            level: NotificationLevel::Silent,
            rule_rows: vec![],
        }
    }
}

// ==================== 通知设置 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Theme {
    Light,
    Dark,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub screen: ScreenSelection,
    pub theme: Theme,
    pub position: PositionConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ScreenSelection {
    ScreenIndex { index: usize },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PositionPreset {
    TopLeft,
    TopCenter,
    TopRight,
    RightCenter,
    BottomRight,
    BottomCenter,
    BottomLeft,
    LeftCenter,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionConfig {
    pub preset: PositionPreset,
    pub offset_x: i32,
    pub offset_y: i32,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            screen: ScreenSelection::ScreenIndex { index: 0 },
            theme: Theme::Light,
            position: PositionConfig {
                preset: PositionPreset::TopRight,
                offset_x: 0,
                offset_y: 50,
            },
        }
    }
}

// ==================== 通用设置 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    pub auto_start: bool,
    pub start_hidden: bool,
    pub close_to_tray: bool,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            auto_start: false,
            start_hidden: false,
            close_to_tray: true,
        }
    }
}

// ==================== Webhook 设置 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookSettings {
    pub enabled: bool,
    pub url: String,
    #[serde(default = "default_webhook_body")]
    pub body: String,
}

fn default_webhook_body() -> String {
    "{\"msgtype\":\"markdown\",\"markdown\":{\"title\":\"Agent HK\",\"text\":\"### Agent HK 通知\\n- **事件**: {{event}}\\n- **工具**: {{tool}}\\n- **命令**: {{command}}\\n- **动作**: {{action}}\"}}".to_string()
}

impl Default for WebhookSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            url: String::new(),
            body: default_webhook_body(),
        }
    }
}

// ==================== 完整配置 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleConfig {
    pub pretooluse: PreToolUseConfig,
    pub permission_request: PermissionRequestConfig,
    pub other_events: HashMap<String, OtherEventConfig>,
    pub notification_settings: NotificationSettings,
    #[serde(default)]
    pub general_settings: GeneralSettings,
    #[serde(default)]
    pub webhook_settings: WebhookSettings,
}

impl Default for RuleConfig {
    fn default() -> Self {
        let mut other_events = HashMap::new();
        let event_names = [
            "PostToolUse",
            "PostToolUseFailure",
            "Notification",
            "SessionStart",
            "SessionEnd",
            "SubagentStart",
            "SubagentStop",
            "Stop",
            "TeammateIdle",
            "TaskCompleted",
            "PreCompact",
            "WorktreeCreate",
            "WorktreeRemove",
            "InstructionsLoaded",
            "ConfigChange",
            "UserPromptSubmit",
        ];
        for name in event_names {
            if name == "Stop" {
                other_events.insert(
                    name.to_string(),
                    OtherEventConfig {
                        level: NotificationLevel::Notify,
                        rule_rows: vec![],
                    },
                );
            } else {
                other_events.insert(name.to_string(), OtherEventConfig::default());
            }
        }

        Self {
            pretooluse: PreToolUseConfig::default(),
            permission_request: PermissionRequestConfig::default(),
            other_events,
            notification_settings: NotificationSettings::default(),
            general_settings: GeneralSettings::default(),
            webhook_settings: WebhookSettings::default(),
        }
    }
}

// ==================== 旧配置迁移 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum LegacyRuleMode {
    Whitelist,
    Blacklist,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegacyToolRule {
    pub tool_name: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegacyContentRule {
    pub pattern: String,
    pub match_type: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegacyRuleConfig {
    pub mode: LegacyRuleMode,
    pub tool_rules: Vec<LegacyToolRule>,
    pub content_rules: Vec<LegacyContentRule>,
    pub auto_allow_unmatched: bool,
}

pub fn migrate_from_legacy_config(legacy: &LegacyRuleConfig) -> RuleConfig {
    let on_match = match legacy.mode {
        LegacyRuleMode::Whitelist => MatchBehavior::ManualConfirm,
        LegacyRuleMode::Blacklist => MatchBehavior::AutoAllow,
    };

    let enabled_tools: Vec<String> = legacy
        .tool_rules
        .iter()
        .filter(|r| r.enabled)
        .map(|r| r.tool_name.clone())
        .collect();

    let enabled_patterns: Vec<String> = legacy
        .content_rules
        .iter()
        .filter(|r| r.enabled)
        .map(|r| r.pattern.clone())
        .collect();

    let mut config = RuleConfig::default();

    config.pretooluse = PreToolUseConfig {
        level: NotificationLevel::Conditional,
        rule_rows: vec![PreToolUseRuleRow {
            id: "migrated-1".to_string(),
            enabled: true,
            tool_names: enabled_tools,
            content_patterns: enabled_patterns,
            notify: true,
            on_match,
        }],
    };

    config
}

// ==================== 配置文件持久化 ====================

fn config_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".config")
        .join("agent-hk")
        .join("config.json")
}

pub fn load_config() -> Result<RuleConfig, Box<dyn std::error::Error>> {
    let path = config_path();
    if path.exists() {
        let content = std::fs::read_to_string(path)?;

        // 尝试解析为新配置
        if let Ok(config) = serde_json::from_str::<RuleConfig>(&content) {
            return Ok(config);
        }

        // 尝试解析为旧配置并迁移
        if let Ok(legacy) = serde_json::from_str::<LegacyRuleConfig>(&content) {
            log::info!("Migrating from legacy config format");
            return Ok(migrate_from_legacy_config(&legacy));
        }

        log::warn!("Failed to parse config, using default");
        Ok(RuleConfig::default())
    } else {
        Ok(RuleConfig::default())
    }
}

pub fn save_config(config: &RuleConfig) -> Result<(), Box<dyn std::error::Error>> {
    let path = config_path();
    std::fs::create_dir_all(path.parent().unwrap())?;
    std::fs::write(path, serde_json::to_string_pretty(config)?)?;
    Ok(())
}
