import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Monitor, Settings, Power, EyeOff, X } from "lucide-react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import type { GeneralSettings } from "@/types";

interface GeneralPanelProps {
  settings: GeneralSettings;
  onChange: (updates: Partial<GeneralSettings>) => void;
}

export function GeneralPanel({ settings, onChange }: GeneralPanelProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [autoStartSynced, setAutoStartSynced] = useState(false);

  // 同步 autostart 插件状态到配置
  useEffect(() => {
    isEnabled().then((enabled) => {
      if (enabled !== settings.auto_start) {
        onChange({ auto_start: enabled });
      }
      setAutoStartSynced(true);
    });
  }, []);

  const handleAutoStartChange = async (checked: boolean) => {
    try {
      if (checked) {
        await enable();
      } else {
        await disable();
      }
      onChange({ auto_start: checked });
    } catch (e) {
      console.error("Failed to toggle autostart:", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">通用设置</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          配置外观和启动行为
        </p>
      </div>

      {/* Theme Settings */}
      <Card className="text-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10">
              {resolvedTheme === "dark" ? (
                <Moon className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-sm">外观设置</CardTitle>
              <CardDescription className="text-xs">选择应用的外观主题，立即生效。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <ThemeOption
              value="light"
              current={theme}
              icon={Sun}
              label="浅色"
              onSelect={() => setTheme("light")}
            />
            <ThemeOption
              value="dark"
              current={theme}
              icon={Moon}
              label="深色"
              onSelect={() => setTheme("dark")}
            />
            <ThemeOption
              value="system"
              current={theme}
              icon={Monitor}
              label="跟随系统"
              onSelect={() => setTheme("system")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Startup & Tray Settings */}
      <Card className="text-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10">
              <Power className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">启动与托盘</CardTitle>
              <CardDescription className="text-xs">配置应用的启动行为和托盘设置。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3 space-y-3">
          <SettingRow
            icon={Power}
            label="开机自启动"
            description="系统启动时自动运行应用"
            checked={settings.auto_start}
            onChange={handleAutoStartChange}
            disabled={!autoStartSynced}
          />
          <SettingRow
            icon={EyeOff}
            label="启动后隐藏到托盘"
            description="应用启动后自动隐藏到系统托盘"
            checked={settings.start_hidden}
            onChange={(checked) => onChange({ start_hidden: checked })}
          />
          <SettingRow
            icon={X}
            label="关闭时最小化到托盘"
            description="点击关闭按钮时最小化到托盘而非退出"
            checked={settings.close_to_tray}
            onChange={(checked) => onChange({ close_to_tray: checked })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface SettingRowProps {
  icon: typeof Power;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ icon: Icon, label, description, checked, onChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

interface ThemeOptionProps {
  value: string;
  current: string;
  icon: typeof Sun;
  label: string;
  onSelect: () => void;
}

function ThemeOption({ value, current, icon: Icon, label, onSelect }: ThemeOptionProps) {
  const isActive = current === value;
  return (
    <button
      onClick={onSelect}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs transition-all ${
        isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
