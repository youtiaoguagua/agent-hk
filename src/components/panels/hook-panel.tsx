import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Plug, CheckCircle2, XCircle, Code2 } from "lucide-react";
import { ALL_HOOK_EVENTS } from "@/types";

export function HookPanel() {
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [configuredEvents, setConfiguredEvents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // 加载当前配置的 hooks
  useEffect(() => {
    loadConfiguredHooks();
  }, []);

  const loadConfiguredHooks = async () => {
    try {
      const events = await invoke<string[]>("get_configured_hooks");
      const eventSet = new Set(events);
      setConfiguredEvents(eventSet);
      setSelectedEvents(eventSet);
    } catch (e) {
      console.error("Failed to load configured hooks:", e);
    }
  };

  const toggleEvent = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const toggleAll = () => {
    if (selectedEvents.size === ALL_HOOK_EVENTS.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(ALL_HOOK_EVENTS.map(e => e.id)));
    }
  };

  const applyConfig = async () => {
    setIsLoading(true);
    try {
      const events = Array.from(selectedEvents);
      const result = await invoke<string>("set_hooks", { events });
      toast.success(result);
      await loadConfiguredHooks();
    } catch (e) {
      toast.error("配置失败: " + e);
    } finally {
      setIsLoading(false);
    }
  };

  const removeConfig = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>("remove_all_hooks");
      toast.success(result);
      setSelectedEvents(new Set());
      await loadConfiguredHooks();
    } catch (e) {
      toast.error("移除失败: " + e);
    } finally {
      setIsLoading(false);
    }
  };

  // 生成配置预览
  const generateConfigPreview = () => {
    if (selectedEvents.size === 0) return "{}";

    const hooks: Record<string, unknown> = {};
    selectedEvents.forEach(eventId => {
      hooks[eventId] = [
        {
          hooks: [
            {
              type: "http",
              url: "http://127.0.0.1:18080/hook",
              timeout: 35,
            },
          ],
        },
      ];
    });

    return JSON.stringify({ hooks }, null, 2);
  };

  const isAllSelected = selectedEvents.size === ALL_HOOK_EVENTS.length;
  const hasChanges =
    selectedEvents.size !== configuredEvents.size ||
    !ALL_HOOK_EVENTS.every(e =>
      selectedEvents.has(e.id) === configuredEvents.has(e.id)
    );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5">
          <Plug className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">Hook 配置</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          配置 Claude Code 的 Hook 事件拦截
        </p>
      </div>

      {/* Event Selection Grid */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-xs">选择事件</CardTitle>
          <CardDescription className="text-xs">
            勾选需要启用 Hook 的事件
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1">
            {/* 全选按钮 */}
            <button
              onClick={toggleAll}
              className={`flex flex-col items-center gap-0.5 p-1 rounded border transition-all min-w-[50px] ${
                isAllSelected
                  ? "border-transparent bg-primary/10"
                  : "border-border hover:border-muted-foreground/50 hover:bg-accent"
              }`}
            >
              <Checkbox checked={isAllSelected} className="h-4 w-4" />
              <span className={`text-[10px] ${isAllSelected ? "font-medium" : ""}`}>
                全选
              </span>
            </button>

            {/* 事件选择按钮 */}
            {ALL_HOOK_EVENTS.map((event) => {
              const isSelected = selectedEvents.has(event.id);
              const isConfigured = configuredEvents.has(event.id);
              return (
                <button
                  key={event.id}
                  onClick={() => toggleEvent(event.id)}
                  className={`flex flex-col items-center gap-0.5 p-1 rounded border transition-all min-w-12.5 ${
                    isSelected
                      ? "border-transparent "
                      : "border-transparent hover:border-muted-foreground/50 hover:bg-accent"
                  }`}
                >
                  <Checkbox checked={isSelected} className="h-4 w-4" />
                  <span className={`text-[10px] ${isSelected ? "font-medium" : ""}`}>
                    {event.label}
                  </span>
                  {isConfigured && (
                    <div className="w-1 h-1 rounded-full bg-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={applyConfig}
          disabled={isLoading || selectedEvents.size === 0}
          className="flex-1"
          size="sm"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          应用配置
        </Button>
        <Button
          variant="outline"
          onClick={removeConfig}
          disabled={isLoading || configuredEvents.size === 0}
          className="flex-1"
          size="sm"
        >
          <XCircle className="w-4 h-4 mr-1" />
          移除配置
        </Button>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded bg-primary/10">
              <Plug className="w-3 h-3 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xs">配置状态</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between p-2 rounded border bg-card/50">
            <div className="flex items-center gap-1.5">
              {configuredEvents.size > 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-medium">已配置</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium">未配置</span>
                </>
              )}
            </div>
            <Badge variant={configuredEvents.size > 0 ? "default" : "secondary"} className={configuredEvents.size > 0 ? "bg-green-500 text-[10px] h-5" : "text-[10px] h-5"}>
              {configuredEvents.size}/{ALL_HOOK_EVENTS.length} 个事件
            </Badge>
          </div>
          {hasChanges && (
            <p className="text-xs text-amber-500 mt-1.5">
              配置已更改，请点击"应用配置"保存
            </p>
          )}
        </CardContent>
      </Card>

      {/* Config Preview */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded bg-primary/10">
              <Code2 className="w-3 h-3 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xs">配置预览</CardTitle>
              <CardDescription className="text-xs">将写入 ~/.claude/settings.json 的内容</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto font-mono">
            {generateConfigPreview()}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
