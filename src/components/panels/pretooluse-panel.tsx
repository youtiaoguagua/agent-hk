import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Hand, Play, Bell } from "lucide-react";
import { useState } from "react";
import type { PreToolUseConfig, PreToolUseRuleRow, MatchBehavior } from "@/types";

interface PreToolUsePanelProps {
  config: PreToolUseConfig;
  onChange: (updates: Partial<PreToolUseConfig>) => void;
  onSave: () => void;
}

const behaviorOptions: { value: MatchBehavior; label: string; icon: typeof Hand }[] = [
  { value: "manual_confirm", label: "手动确认", icon: Hand },
  { value: "auto_allow", label: "自动允许", icon: CheckCircle2 },
  { value: "auto_deny", label: "自动阻止", icon: XCircle },
  { value: "notify_only", label: "仅通知", icon: Bell },
];

export function PreToolUsePanel({ config, onChange, onSave }: PreToolUsePanelProps) {
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editingTools, setEditingTools] = useState("");
  const [editingContent, setEditingContent] = useState("");

  const addRuleRow = () => {
    const newRow: PreToolUseRuleRow = {
      id: `rule-${Date.now()}`,
      enabled: true,
      tool_names: [],
      content_patterns: [],
      notify: false,
      on_match: "manual_confirm",
    };
    onChange({ rule_rows: [...config.rule_rows, newRow] });
    // 立即进入编辑模式
    setEditingRow(newRow.id);
    setEditingTools("");
    setEditingContent("");
  };

  const removeRuleRow = (id: string) => {
    onChange({ rule_rows: config.rule_rows.filter((r) => r.id !== id) });
  };

  const updateRow = (id: string, updates: Partial<PreToolUseRuleRow>) => {
    onChange({
      rule_rows: config.rule_rows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  const startEditing = (row: PreToolUseRuleRow) => {
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

  // const formatList = (items: string[]) => {
  //   if (items.length === 0) return "-";
  //   return items.join(", ");
  // };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight">PreToolUse</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            配置工具执行前的通知规则
          </p>
        </div>
        <Button onClick={onSave}>保存配置</Button>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">规则配置</CardTitle>
              <CardDescription className="text-xs">
                每行是一个规则组，匹配后按该行的行为处理
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
                    <th className="text-left py-2 px-2 font-medium w-20">是否通知</th>
                    <th className="text-left py-2 px-2 font-medium w-28">匹配行为</th>
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

                      {/* Notify */}
                      <td className="py-2 px-2">
                        <Switch
                          checked={row.notify}
                          onCheckedChange={(c) => updateRow(row.id, { notify: c })}
                          // disabled={editingRow !== row.id}
                          className="scale-75"
                        />
                      </td>

                      {/* Match Behavior */}
                      <td className="py-2 px-2">
                        {editingRow === row.id ? (
                          <Select
                            value={row.on_match}
                            onValueChange={(v) => updateRow(row.id, { on_match: v as MatchBehavior })}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {behaviorOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1">
                            {row.on_match === "manual_confirm" && <Hand className="w-3 h-3" />}
                            {row.on_match === "auto_allow" && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            {row.on_match === "auto_deny" && <XCircle className="w-3 h-3 text-red-500" />}
                            {row.on_match === "notify_only" && <Bell className="w-3 h-3 text-amber-500" />}
                            <span className="text-xs">
                              {behaviorOptions.find((o) => o.value === row.on_match)?.label}
                            </span>
                          </div>
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
              <li>行间：从上到下顺序匹配第一行，匹配成功后停止</li>
              <li>空列表表示匹配所有（工具名为空表示任意工具，内容为空表示任意内容）</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
