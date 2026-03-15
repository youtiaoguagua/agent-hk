import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";

export function PermissionRequestPanel() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">PermissionRequest</h2>
          <Badge variant="secondary" className="text-xs">固定配置</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          此事件类型由 Claude Code 设计固定，不可更改
        </p>
      </div>

      {/* Fixed Behavior Info */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">固定行为说明</CardTitle>
          </div>
          <CardDescription className="text-xs">
            PermissionRequest 是 Claude Code 的权限确认事件
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-xs">始终通知</p>
                <p className="text-xs text-muted-foreground">
                  所有 PermissionRequest 事件都会显示通知
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-xs">必须手动确认</p>
                <p className="text-xs text-muted-foreground">
                  用户必须手动点击 Accept 或 Deny，无法自动处理
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
              <Lock className="w-4 h-4 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-xs">不可配置</p>
                <p className="text-xs text-muted-foreground">
                  此设计由 Claude Code 决定，确保用户权限确认的严肃性
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <strong>为什么这样设计？</strong> PermissionRequest 事件表示 Claude Code
                需要用户明确授权才能执行某些操作（如敏感文件操作、外部 API 调用等）。
                这是 Claude Code 的安全机制，不能绕过。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-xs">事件详情</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">事件名称</span>
              <code className="bg-muted px-1.5 rounded">PermissionRequest</code>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">触发时机</span>
              <span>当 Claude Code 请求权限时</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">可否阻止</span>
              <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                可以（deny）
              </Badge>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">配置选项</span>
              <span className="text-muted-foreground">无</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
