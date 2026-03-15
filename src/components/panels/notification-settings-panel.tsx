import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Monitor, Sun, Moon, Move, TestTube } from "lucide-react";
import type { NotificationSettings, MonitorInfo, PositionPreset, ScreenSelection, Theme } from "@/types";

interface NotificationSettingsPanelProps {
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
  onSave: () => void;
}

export function NotificationSettingsPanel({
  settings,
  onChange,
  onSave,
}: NotificationSettingsPanelProps) {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMonitors();
  }, []);

  const loadMonitors = async () => {
    try {
      const result = await invoke<MonitorInfo[]>("get_available_monitors");
      setMonitors(result);
    } catch (e) {
      console.error("Failed to load monitors:", e);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      await invoke("show_test_notification");
      toast.success("测试通知已发送");
    } catch (e) {
      toast.error("发送失败: " + e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateScreen = (screen: ScreenSelection) => {
    onChange({ ...settings, screen });
  };

  const updateTheme = (theme: Theme) => {
    onChange({ ...settings, theme });
  };

  const updatePosition = (preset: PositionPreset) => {
    onChange({
      ...settings,
      position: { ...settings.position, preset },
    });
  };

  const updateOffset = (offsetX: number, offsetY: number) => {
    onChange({
      ...settings,
      position: {
        ...settings.position,
        offset_x: offsetX,
        offset_y: offsetY,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">通知设置</h2>
          <p className="text-xs text-muted-foreground">
            自定义通知的显示位置、主题和屏幕
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleTestNotification} disabled={isLoading}>
            <TestTube className="w-3.5 h-3.5 mr-1" />
            测试
          </Button>
          <Button size="sm" onClick={onSave}>保存</Button>
        </div>
      </div>

      {/* 屏幕选择 */}
      <Card className="text-sm">
        <CardHeader className="pb-2 pt-4 px-3">
          <div className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
            <CardTitle className="text-sm">显示屏幕</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          {monitors.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {monitors.map((monitor) => (
                <ScreenOption
                  key={monitor.index}
                  label={monitor.name}
                  description={`${monitor.size[0]}x${monitor.size[1]}${monitor.is_primary ? " · 主屏幕" : ""}`}
                  selected={settings.screen.type === "screen_index" && settings.screen.index === monitor.index}
                  onClick={() => updateScreen({ type: "screen_index", index: monitor.index })}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">正在加载屏幕信息...</p>
          )}
        </CardContent>
      </Card>

      {/* 主题设置 */}
      <Card className="text-sm">
        <CardHeader className="pb-2 pt-4 px-3">
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
            <CardTitle className="text-sm">通知主题</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <ThemeOption
              label="浅色"
              icon={<Sun className="w-3.5 h-3.5" />}
              selected={settings.theme === "light"}
              onClick={() => updateTheme("light")}
            />
            <ThemeOption
              label="深色"
              icon={<Moon className="w-3.5 h-3.5" />}
              selected={settings.theme === "dark"}
              onClick={() => updateTheme("dark")}
            />
          </div>
        </CardContent>
      </Card>

      {/* 位置设置 */}
      <Card className="text-sm">
        <CardHeader className="pb-2 pt-4 px-3">
          <div className="flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-muted-foreground" />
            <CardTitle className="text-sm">通知位置</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="flex gap-4 items-start">
            {/* 左侧：位置选择器 */}
            <div className="flex-shrink-0">
              <div className="grid grid-cols-3 gap-1.5 p-3 bg-muted rounded-lg">
                {/* 第一行 */}
                <PositionButton
                  preset="top_left"
                  label="左上"
                  selected={settings.position.preset === "top_left"}
                  onClick={() => updatePosition("top_left")}
                />
                <PositionButton
                  preset="top_center"
                  label="上中"
                  selected={settings.position.preset === "top_center"}
                  onClick={() => updatePosition("top_center")}
                />
                <PositionButton
                  preset="top_right"
                  label="右上"
                  selected={settings.position.preset === "top_right"}
                  onClick={() => updatePosition("top_right")}
                />
                {/* 第二行 */}
                <PositionButton
                  preset="left_center"
                  label="左中"
                  selected={settings.position.preset === "left_center"}
                  onClick={() => updatePosition("left_center")}
                />
                <div className="w-12 h-12 flex items-center justify-center text-muted-foreground text-[10px]">
                  屏幕
                </div>
                <PositionButton
                  preset="right_center"
                  label="右中"
                  selected={settings.position.preset === "right_center"}
                  onClick={() => updatePosition("right_center")}
                />
                {/* 第三行 */}
                <PositionButton
                  preset="bottom_left"
                  label="左下"
                  selected={settings.position.preset === "bottom_left"}
                  onClick={() => updatePosition("bottom_left")}
                />
                <PositionButton
                  preset="bottom_center"
                  label="下中"
                  selected={settings.position.preset === "bottom_center"}
                  onClick={() => updatePosition("bottom_center")}
                />
                <PositionButton
                  preset="bottom_right"
                  label="右下"
                  selected={settings.position.preset === "bottom_right"}
                  onClick={() => updatePosition("bottom_right")}
                />
              </div>
            </div>

            {/* 右侧：偏移量设置 */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">X 偏移 (px)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={settings.position.offset_x}
                  onChange={(e) => updateOffset(parseInt(e.target.value) || 0, settings.position.offset_y)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Y 偏移 (px)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={settings.position.offset_y}
                  onChange={(e) => updateOffset(settings.position.offset_x, parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 屏幕选项组件
function ScreenOption({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md border text-left transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      <div className="font-medium text-xs">{label}</div>
      <div className="text-[10px] text-muted-foreground">{description}</div>
    </button>
  );
}

// 主题选项组件
function ThemeOption({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
    >
      {icon}
      <span className="font-medium text-xs">{label}</span>
    </button>
  );
}

// 位置按钮组件
function PositionButton({
  preset: _preset,
  label,
  selected,
  onClick,
}: {
  preset: PositionPreset;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-md flex flex-col items-center justify-center gap-0.5 transition-all ${
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-background hover:bg-background/80 border border-border"
      }`}
    >
      <div className={`w-2.5 h-2.5 rounded-sm ${selected ? "bg-primary-foreground/50" : "bg-muted"}`} />
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
