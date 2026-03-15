import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Send, TestTube, Code } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { toast } from "sonner";
import type { WebhookSettings } from "@/types";

interface WebhookPanelProps {
  settings: WebhookSettings;
  onChange: (updates: Partial<WebhookSettings>) => void;
}

const PLACEHOLDERS = [
  { key: "{{event}}", desc: "事件名称（如 PreToolUse）" },
  { key: "{{tool}}", desc: "工具名称（如 Bash）" },
  { key: "{{command}}", desc: "命令内容" },
  { key: "{{action}}", desc: "动作（notify / decide）" },
];

export function WebhookPanel({ settings, onChange }: WebhookPanelProps) {
  const [url, setUrl] = useState(settings.url);
  const [body, setBody] = useState(settings.body);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!url) {
      toast.error("请先输入 Webhook URL");
      return;
    }
    onChange({ url, body });
    setTesting(true);
    try {
      const result = await invoke<string>("test_webhook");
      toast.success(result);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Webhook</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          将通知转发到外部 Webhook（如钉钉、飞书等）
        </p>
      </div>

      {/* Enable + URL */}
      <Card className="text-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-primary/10">
                <Send className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">启用 Webhook</CardTitle>
                <CardDescription className="text-xs">
                  开启后，通知会同时转发到 Webhook URL
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => onChange({ enabled: checked })}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => onChange({ url })}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={handleTest}
                disabled={testing || !url}
              >
                <TestTube className="w-3.5 h-3.5 mr-1" />
                {testing ? "发送中..." : "测试"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body Template */}
      <Card className="text-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10">
              <Code className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">请求体模板</CardTitle>
              <CardDescription className="text-xs">
                自定义 POST 请求的 JSON Body，使用占位符注入通知数据
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <span
                key={p.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs"
                title={p.desc}
              >
                <code className="text-primary font-semibold">{p.key}</code>
                <span className="text-muted-foreground">{p.desc}</span>
              </span>
            ))}
          </div>
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => onChange({ body })}
            spellCheck={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
