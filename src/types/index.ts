// ==================== 匹配规则行 ====================

export interface PreToolUseRuleRow {
  id: string;
  enabled: boolean;
  tool_names: string[];       // 工具名列表，空表示匹配所有工具
  content_patterns: string[]; // 内容模式列表，空表示匹配所有内容
  notify: boolean;            // 是否通知，默认否
  on_match: MatchBehavior;
}

export interface OtherEventRuleRow {
  id: string;
  enabled: boolean;
  tool_names: string[];
  content_patterns: string[];
}

// ==================== 通知级别 ====================

export type NotificationLevel = "notify" | "silent" | "conditional";

// ==================== 匹配后行为 ====================

export type MatchBehavior = "manual_confirm" | "auto_allow" | "auto_deny" | "notify_only";

// ==================== 事件配置 ====================

export interface PreToolUseConfig {
  level: NotificationLevel;
  rule_rows: PreToolUseRuleRow[]; // 仅当 level == "conditional" 时有效
}

export interface PermissionRequestConfig {
  readonly fixed: true;
}

export interface OtherEventConfig {
  level: NotificationLevel;
  rule_rows: OtherEventRuleRow[]; // 仅当 level == "conditional" 时有效
}

// ==================== 通用设置 ====================

export interface GeneralSettings {
  auto_start: boolean;
  start_hidden: boolean;
  close_to_tray: boolean;
}

// ==================== Webhook 设置 ====================

export interface WebhookSettings {
  enabled: boolean;
  url: string;
  body: string;
}

// ==================== 完整配置 ====================

export interface RuleConfig {
  pretooluse: PreToolUseConfig;
  permission_request: PermissionRequestConfig;
  other_events: Record<string, OtherEventConfig>;
  notification_settings: NotificationSettings;
  general_settings: GeneralSettings;
  webhook_settings: WebhookSettings;
}

// 默认配置
export function createDefaultConfig(): RuleConfig {
  return {
    pretooluse: {
      level: "conditional",
      rule_rows: [
        {
          id: "rule-1",
          enabled: true,
          tool_names: ["Bash", "Edit"],
          content_patterns: ["rm -rf", "DROP TABLE"],
          notify: true,
          on_match: "manual_confirm",
        },
      ],
    },
    permission_request: { fixed: true },
    other_events: {
      PostToolUse: { level: "silent", rule_rows: [] },
      PostToolUseFailure: { level: "silent", rule_rows: [] },
      Notification: { level: "silent", rule_rows: [] },
      SessionStart: { level: "silent", rule_rows: [] },
      SessionEnd: { level: "silent", rule_rows: [] },
      SubagentStart: { level: "silent", rule_rows: [] },
      SubagentStop: { level: "silent", rule_rows: [] },
      Stop: { level: "silent", rule_rows: [] },
      TeammateIdle: { level: "silent", rule_rows: [] },
      TaskCompleted: { level: "silent", rule_rows: [] },
      PreCompact: { level: "silent", rule_rows: [] },
      WorktreeCreate: { level: "silent", rule_rows: [] },
      WorktreeRemove: { level: "silent", rule_rows: [] },
      InstructionsLoaded: { level: "silent", rule_rows: [] },
      ConfigChange: { level: "silent", rule_rows: [] },
      UserPromptSubmit: { level: "silent", rule_rows: [] },
    },
    notification_settings: {
      screen: { type: "screen_index", index: 0 },
      theme: "light",
      position: {
        preset: "top_right",
        offset_x: 0,
        offset_y: 50,
      },
    },
    general_settings: {
      auto_start: false,
      start_hidden: false,
      close_to_tray: true,
    },
    webhook_settings: {
      enabled: false,
      url: "",
      body: '{"msgtype":"markdown","markdown":{"title":"Agent HK","text":"### Agent HK 通知\\n- **事件**: {{event}}\\n- **工具**: {{tool}}\\n- **命令**: {{command}}\\n- **动作**: {{action}}"}}',
    },
  };
}

// ==================== 请求日志 ====================

export interface RequestLog {
  id: string;
  timestamp: number;
  hook_event_name: string;
  tool_name: string | null;
  command: string | null;
  decision: string;
  matched: boolean;
}

// ==================== 菜单项 ====================

export type MainMenuItem = "rules" | "general" | "notifications" | "hook" | "notification_settings" | "webhook";

export const mainMenuItems: { id: MainMenuItem; label: string }[] = [
  { id: "rules", label: "规则" },
  { id: "general", label: "通用设置" },
  { id: "hook", label: "Hook 配置" },
  { id: "notifications", label: "通知记录" },
  { id: "notification_settings", label: "通知设置" },
  { id: "webhook", label: "Webhook" },
];

export type RulesSubMenuItem =
  | "pretooluse"
  | "permissionrequest"
  | "otherevents";

export type OtherEventItem =
  | "PostToolUse"
  | "PostToolUseFailure"
  | "Notification"
  | "SessionStart"
  | "SessionEnd"
  | "SubagentStart"
  | "SubagentStop"
  | "Stop"
  | "TeammateIdle"
  | "TaskCompleted"
  | "PreCompact"
  | "WorktreeCreate"
  | "WorktreeRemove"
  | "InstructionsLoaded"
  | "ConfigChange"
  | "UserPromptSubmit";

export const otherEventItems: { id: OtherEventItem; label: string; description: string }[] = [
  { id: "PostToolUse", label: "PostToolUse", description: "工具使用后事件" },
  { id: "PostToolUseFailure", label: "PostToolUseFailure", description: "工具使用失败事件" },
  { id: "Notification", label: "Notification", description: "通知事件" },
  { id: "SessionStart", label: "SessionStart", description: "会话开始" },
  { id: "SessionEnd", label: "SessionEnd", description: "会话结束" },
  { id: "SubagentStart", label: "SubagentStart", description: "子代理启动" },
  { id: "SubagentStop", label: "SubagentStop", description: "子代理停止" },
  { id: "Stop", label: "Stop", description: "停止响应" },
  { id: "TeammateIdle", label: "TeammateIdle", description: "队友空闲" },
  { id: "TaskCompleted", label: "TaskCompleted", description: "任务完成" },
  { id: "PreCompact", label: "PreCompact", description: "上下文压缩前" },
  { id: "WorktreeCreate", label: "WorktreeCreate", description: "工作区创建" },
  { id: "WorktreeRemove", label: "WorktreeRemove", description: "工作区删除" },
  { id: "InstructionsLoaded", label: "InstructionsLoaded", description: "指令加载" },
  { id: "ConfigChange", label: "ConfigChange", description: "配置变更" },
  { id: "UserPromptSubmit", label: "UserPromptSubmit", description: "用户提交" },
];

// ==================== Hook 事件配置 ====================

export interface HookEventItem {
  id: string;
  label: string;
  description: string;
}

export const ALL_HOOK_EVENTS: HookEventItem[] = [
  { id: "PreToolUse", label: "PreToolUse", description: "工具使用前" },
  { id: "PermissionRequest", label: "PermissionRequest", description: "权限请求" },
  { id: "PostToolUse", label: "PostToolUse", description: "工具使用后" },
  { id: "PostToolUseFailure", label: "PostToolUseFailure", description: "工具使用失败" },
  { id: "Notification", label: "Notification", description: "通知事件" },
  { id: "SessionStart", label: "SessionStart", description: "会话开始" },
  { id: "SessionEnd", label: "SessionEnd", description: "会话结束" },
  { id: "SubagentStart", label: "SubagentStart", description: "子代理启动" },
  { id: "SubagentStop", label: "SubagentStop", description: "子代理停止" },
  { id: "Stop", label: "Stop", description: "停止响应" },
  { id: "TeammateIdle", label: "TeammateIdle", description: "队友空闲" },
  { id: "TaskCompleted", label: "TaskCompleted", description: "任务完成" },
  { id: "PreCompact", label: "PreCompact", description: "上下文压缩前" },
  { id: "WorktreeCreate", label: "WorktreeCreate", description: "工作区创建" },
  { id: "WorktreeRemove", label: "WorktreeRemove", description: "工作区删除" },
  { id: "InstructionsLoaded", label: "InstructionsLoaded", description: "指令加载" },
  { id: "ConfigChange", label: "ConfigChange", description: "配置变更" },
  { id: "UserPromptSubmit", label: "UserPromptSubmit", description: "用户提交" },
];

// ==================== 旧配置迁移 ====================

export interface LegacyToolRule {
  tool_name: string;
  enabled: boolean;
}

export interface LegacyContentRule {
  pattern: string;
  match_type: string;
  enabled: boolean;
}

export interface LegacyRuleConfig {
  mode: "Whitelist" | "Blacklist";
  tool_rules: LegacyToolRule[];
  content_rules: LegacyContentRule[];
  auto_allow_unmatched: boolean;
}

export function migrateFromLegacyConfig(legacy: LegacyRuleConfig): RuleConfig {
  const onMatch: MatchBehavior = legacy.mode === "Whitelist" ? "manual_confirm" : "auto_allow";

  const enabledToolNames = legacy.tool_rules.filter(r => r.enabled).map(r => r.tool_name);
  const enabledPatterns = legacy.content_rules.filter(r => r.enabled).map(r => r.pattern);

  return {
    pretooluse: {
      level: "conditional",
      rule_rows: [
        {
          id: "migrated-1",
          enabled: true,
          tool_names: enabledToolNames,
          content_patterns: enabledPatterns,
          notify: true,
          on_match: onMatch,
        },
      ],
    },
    permission_request: { fixed: true },
    other_events: createDefaultConfig().other_events,
    notification_settings: createDefaultConfig().notification_settings,
    general_settings: createDefaultConfig().general_settings,
    webhook_settings: createDefaultConfig().webhook_settings,
  };
}

// ==================== 通知设置 ====================

export type ScreenSelection =
  | { type: "screen_index"; index: number };

export type PositionPreset =
  | "top_left"
  | "top_center"
  | "top_right"
  | "right_center"
  | "bottom_right"
  | "bottom_center"
  | "bottom_left"
  | "left_center";

export type Theme = "light" | "dark";

export interface PositionConfig {
  preset: PositionPreset;
  offset_x: number;
  offset_y: number;
}

export interface NotificationSettings {
  screen: ScreenSelection;
  theme: Theme;
  position: PositionConfig;
}

export interface MonitorInfo {
  index: number;
  name: string;
  is_primary: boolean;
  size: [number, number];
  position: [number, number];
}
