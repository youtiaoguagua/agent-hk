import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Eye,
  X,
} from "lucide-react";
import type { RequestLog } from "@/types";

// 确认对话框组件
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ isOpen, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-lg border shadow-lg max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-6">{description}</p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            确认
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationsPanel() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    refreshLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refreshLogs, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const refreshLogs = async () => {
    try {
      const result = await invoke<RequestLog[]>("get_request_logs");
      setLogs(result);
    } catch (e) {
      console.error(e);
    }
  };

  const clearLogs = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "清空日志",
      description: "确定要清空所有日志吗？此操作无法撤销。",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await invoke("clear_request_logs");
          setLogs([]);
          toast.success("日志已清空");
        } catch (e) {
          toast.error("清空失败: " + e);
        }
      },
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getDecisionIcon = (decision: string, matched: boolean) => {
    if (!matched) return <AlertCircle className="w-3.5 h-3.5" />;
    if (decision === "allow") return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (decision === "deny") return <XCircle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const getDecisionColor = (decision: string, matched: boolean) => {
    if (!matched) return "bg-gray-500";
    if (decision === "allow") return "bg-green-500";
    if (decision === "deny") return "bg-red-500";
    return "bg-yellow-500";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">通知记录</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            查看所有拦截和处理的请求日志
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={(c) => setAutoRefresh(c as boolean)}
            />
            <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
              自动刷新
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={refreshLogs}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <Trash2 className="w-4 h-4 mr-1" />
            清空
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="总请求"
          value={logs.length}
          icon={FileText}
        />
        <StatCard
          label="已匹配"
          value={logs.filter((l) => l.matched).length}
          icon={CheckCircle2}
          color="blue"
        />
        <StatCard
          label="已允许"
          value={logs.filter((l) => l.decision === "allow").length}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="已拒绝"
          value={logs.filter((l) => l.decision === "deny").length}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Log List */}
      {logs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="text-base font-medium text-muted-foreground">暂无请求日志</h3>
            <p className="text-sm text-muted-foreground mt-1">
              当 Claude Code 使用工具时会显示在这里
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card
              key={log.id}
              className="cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => setSelectedLog(log)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md ${getDecisionColor(log.decision, log.matched)} text-white`}>
                    {getDecisionIcon(log.decision, log.matched)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{log.hook_event_name}</span>
                      {log.tool_name && (
                        <>
                          <span className="text-muted-foreground text-sm">/</span>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {log.tool_name}
                          </code>
                        </>
                      )}
                    </div>
                    {log.command && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {log.command.length > 50 ? log.command.slice(0, 50) + "..." : log.command}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={log.matched ? "default" : "secondary"} className={`text-xs ${log.matched ? getDecisionColor(log.decision, true) : ""}`}>
                      {log.matched ? log.decision.toUpperCase() : "AUTO"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(log.timestamp)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <Card
            className="w-full max-w-xl max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${getDecisionColor(selectedLog.decision, selectedLog.matched)} text-white`}>
                  {getDecisionIcon(selectedLog.decision, selectedLog.matched)}
                </div>
                <div>
                  <CardTitle className="text-base">请求详情</CardTitle>
                  <CardDescription className="text-xs">{formatTime(selectedLog.timestamp)}</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedLog(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="事件" value={selectedLog.hook_event_name} />
                <InfoItem
                  label="决策"
                  value={selectedLog.matched ? selectedLog.decision.toUpperCase() : "自动允许"}
                  badge={selectedLog.matched ? getDecisionColor(selectedLog.decision, true) : "bg-gray-500"}
                />
              </div>

              {selectedLog.tool_name && (
                <InfoItem
                  label="工具"
                  value={selectedLog.tool_name}
                  code
                />
              )}

              {selectedLog.command && (
                <div>
                  <Label className="text-xs text-muted-foreground">命令</Label>
                  <pre className="mt-1 p-2 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                    {selectedLog.command}
                  </pre>
                </div>
              )}

              <InfoItem
                label="请求 ID"
                value={selectedLog.id}
                code
                small
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = "gray",
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  color?: "gray" | "blue" | "green" | "red";
}) {
  const colorClasses = {
    gray: "bg-muted text-foreground",
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
  };

  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${colorClasses[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoItem({
  label,
  value,
  code,
  small,
  badge,
}: {
  label: string;
  value: string;
  code?: boolean;
  small?: boolean;
  badge?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {badge ? (
        <Badge className={`mt-1 text-xs ${badge}`}>{value}</Badge>
      ) : code ? (
        <code className={`block mt-1 px-2 py-1 bg-muted rounded font-mono ${small ? "text-xs" : "text-sm"}`}>
          {value}
        </code>
      ) : (
        <p className="mt-1 font-medium text-sm">{value}</p>
      )}
    </div>
  );
}
