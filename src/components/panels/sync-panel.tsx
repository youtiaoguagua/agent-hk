import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Cloud, CloudOff, CheckCircle2, AlertCircle } from "lucide-react";

export function SyncPanel() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">数据同步</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          同步配置和日志到云端（功能开发中）
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <CloudOff className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm">同步状态</CardTitle>
              <CardDescription className="text-xs">当前同步配置状态</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between p-3 rounded-md border border-dashed">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">未配置云端同步</span>
            </div>
            <Badge variant="secondary" className="text-xs">开发中</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-3 gap-3">
        <FeatureCard
          icon={Cloud}
          title="云端备份"
          description="将配置备份到云端"
          comingSoon
        />
        <FeatureCard
          icon={RefreshCw}
          title="多设备同步"
          description="跨设备保持配置一致"
          comingSoon
        />
        <FeatureCard
          icon={CheckCircle2}
          title="自动同步"
          description="配置变更自动同步"
          comingSoon
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  comingSoon,
}: {
  icon: typeof Cloud;
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4 text-center">
        <div className="p-2 rounded-md bg-muted w-fit mx-auto mb-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm mb-0.5">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
        {comingSoon && (
          <Badge variant="secondary" className="mt-2 text-xs">
            即将推出
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
