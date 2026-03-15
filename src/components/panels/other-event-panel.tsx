import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Bell, VolumeX, Settings, Info } from "lucide-react";
import { useState } from "react";
import type { OtherEventConfig, OtherEventItem, OtherEventRuleRow } from "@/types";

interface OtherEventPanelProps {
  eventName: OtherEventItem;
  config: OtherEventConfig;
  onChange: (updates: Partial<OtherEventConfig>) => void;
  onSave: () => void;
  onEventChange: (event: OtherEventItem) => void;
}

const levelOptions = [
  { value: "notify" as const, label: "始终通知", description: "所有请求都显示通知", icon: Bell },
  { value: "silent" as const, label: "不通知", description: "静默处理", icon: VolumeX },
  { value: "conditional" as const, label: "有条件通知", description: "根据规则匹配决定", icon: Settings },
];

const eventDescriptions: Record<OtherEventItem, { description: string; note: string }> = {
  PostToolUse: {
    description: "工具成功执行后触发",
    note: "此事件在工具已执行后触发，无法阻止操作，仅用于审计。",
  },
  PostToolUseFailure: {
    description: "工具执行失败后触发",
    note: "此事件在工具执行失败后触发，无法阻止操作。",
  },
  Notification: {
    description: "Claude Code 发送通知时触发",
    note: "此事件仅用于日志记录，无法阻止通知发送。",
  },
  SessionStart: {
    description: "会话开始或恢复时触发",
    note: "此事件在会话开始时触发，无法阻止。",
  },
  SessionEnd: {
    description: "会话结束时触发",
    note: "此事件在会话结束时触发，无法阻止。",
  },
  SubagentStart: {
    description: "子代理启动时触发",
    note: "此事件在子代理启动时触发，无法阻止。",
  },
  SubagentStop: {
    description: "子代理结束时触发",
    note: "此事件可以阻止子代理停止，但通常不需要。",
  },
  Stop: {
    description: "Claude 停止响应时触发",
    note: "此事件可以阻止 Claude 停止，继续对话。",
  },
  TeammateIdle: {
    description: "队友即将空闲时触发",
    note: "此事件可以阻止队友进入空闲状态。",
  },
  TaskCompleted: {
    description: "任务被标记为完成时触发",
    note: "此事件可以阻止任务标记为完成。",
  },
  PreCompact: {
    description: "上下文压缩前触发",
    note: "此事件无法阻止压缩。",
  },
  WorktreeCreate: {
    description: "工作区创建时触发",
    note: "此事件可以阻止工作区创建。",
  },
  WorktreeRemove: {
    description: "工作区删除时触发",
    note: "此事件无法阻止工作区删除。",
  },
  InstructionsLoaded: {
    description: "指令文件加载时触发",
    note: "此事件完全无决策控制，仅用于审计。",
  },
  ConfigChange: {
    description: "配置变更时触发",
    note: "此事件可以阻止配置变更。",
  },
  UserPromptSubmit: {
    description: "用户提交提示时触发",
    note: "此事件可以阻止提示处理。",
  },
};

export function OtherEventPanel({
  eventName,
  config,
  onChange,
  onSave,
}: OtherEventPanelProps) {
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editingTools, setEditingTools] = useState("");
  const [editingContent, setEditingContent] = useState("");

  const eventInfo = eventDescriptions[eventName];
  const isConditional = config.level === "conditional";

  const addRuleRow = () => {
    const newRow: OtherEventRuleRow = {
      id: `rule-${Date.now()}`,
      enabled: true,
      tool_names: [],
      content_patterns: [],
    };
    onChange({ rule_rows: [...config.rule_rows, newRow] });
    setEditingRow(newRow.id);
    setEditingTools("");
    setEditingContent("");
  };

  const removeRuleRow = (id: string) => {
    onChange({ rule_rows: config.rule_rows.filter((r) => r.id !== id) });
  };

  const updateRow = (id: string, updates: Partial<OtherEventRuleRow>) => {
    onChange({
      rule_rows: config.rule_rows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  const startEditing = (row: OtherEventRuleRow) => {
    setEditingRow(row.id);
    setEditingTools(row.tool_names.join(", "));
    setEditingContent(row.content_patterns.join(", "));
  };

  const saveEditing = (id: string) => {
    const toolNames = editingTools
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const contentPatterns = editingContent
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    updateRow(id, { tool_names: toolNames, content_patterns: contentPatterns });
    setEditingRow(null);
  };

  const cancelEditing = () => {
    setEditingRow(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">{eventName}</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {eventInfo.description}
          </p>
        </div>
        <Button onClick={onSave}>保存配置</Button>
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">{eventInfo.note}</p>
      </div>

      {/* Notification Level - Choice Cards (Horizontal with icon on left) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">通知设置</CardTitle>
          <CardDescription className="text-xs">
            选择如何处理 {eventName} 事件
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3">
            {levelOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = config.level === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onChange({ level: opt.value })}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50 hover:bg-muted"
                  }`}
                >
                  <div className={`shrink-0 p-2 rounded-full ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-medium text-sm ${isSelected ? "text-primary" : ""}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {opt.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      {isConditional && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">规则配置</CardTitle>
                <CardDescription className="text-xs">
                  匹配规则时显示通知（无决策控制）
                </CardDescription>
              </div>
              <Button size="sm" onClick={addRuleRow}>
                <Plus className="w-4 h-4 mr-1" />
                添加规则行
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {config.rule_rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <p className="text-sm">暂无规则</p>
                <p className="text-xs mt-1">点击"添加规则行"创建第一条规则</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium w-12">启用</th>
                      <th className="text-left py-2 px-2 font-medium">工具规则</th>
                      <th className="text-left py-2 px-2 font-medium">内容规则</th>
                      <th className="text-right py-2 px-2 font-medium w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.rule_rows.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/50">
                        {/* Enabled */}
                        <td className="py-2 px-2">
                          <Switch
                            checked={row.enabled}
                            onCheckedChange={(c) => updateRow(row.id, { enabled: c })}
                            className="scale-75"
                          />
                        </td>

                        {/* Tool Names */}
                        <td className="py-2 px-2">
                          {editingRow === row.id ? (
                            <Input
                              value={editingTools}
                              onChange={(e) => setEditingTools(e.target.value)}
                              placeholder="Bash, Edit"
                              className="h-8 text-xs"
                            />
                          ) : (
                            <span className="text-xs">
                              {row.tool_names.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.tool_names.map((name) => (
                                    <Badge key={name} variant="secondary" className="text-xs">
                                      {name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </span>
                          )}
                        </td>

                        {/* Content Patterns */}
                        <td className="py-2 px-2">
                          {editingRow === row.id ? (
                            <Input
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              placeholder="rm -rf, DROP TABLE"
                              className="h-8 text-xs"
                            />
                          ) : (
                            <span className="text-xs">
                              {row.content_patterns.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.content_patterns.map((pattern) => (
                                    <Badge key={pattern} variant="outline" className="text-xs">
                                      {pattern}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-2 text-right">
                          {editingRow === row.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => saveEditing(row.id)}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={cancelEditing}
                              >
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => startEditing(row)}
                              >
                                <Edit2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeRuleRow(row.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <p className="font-medium mb-1">💡 匹配逻辑：</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>行内：(匹配任意工具名) OR (匹配任意内容模式)</li>
                <li>行间：从上到下顺序匹配第一行，匹配后显示通知</li>
                <li>此事件无法阻止操作，仅用于决定是否发送通知</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
