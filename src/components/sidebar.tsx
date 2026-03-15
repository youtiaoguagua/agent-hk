import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Shield, Settings, Bell, Plug, Moon, Sun, Monitor, Palette, Send } from "lucide-react";
import type { MainMenuItem } from "@/types";

const menuIcons: Record<MainMenuItem, typeof Shield> = {
  rules: Shield,
  general: Settings,
  hook: Plug,
  notifications: Bell,
  notification_settings: Palette,
  webhook: Send,
};

interface SidebarProps {
  activeMenu: MainMenuItem;
  onMenuChange: (menu: MainMenuItem) => void;
}

export function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const [version, setVersion] = useState("");
  useEffect(() => { getVersion().then(setVersion); }, []);

  const menuItems: { id: MainMenuItem; label: string }[] = [
    { id: "rules", label: "规则" },
    { id: "hook", label: "Hook 配置" },
    { id: "notifications", label: "通知记录" },
    { id: "notification_settings", label: "通知设置" },
    { id: "webhook", label: "Webhook" },
    { id: "general", label: "通用设置" },
  ];

  return (
    <aside className="w-16 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-3 border-b border-border flex items-center justify-center">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-10 h-10 rounded-xl"
        />
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-3 px-2 space-y-2">
        {menuItems.map((item) => {
          const Icon = menuIcons[item.id];
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`
                w-full flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-all duration-200
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }
              `}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-2">
        <div className="flex items-center justify-center">
          <ThemeToggle />
        </div>
        <div className="text-[10px] text-muted-foreground text-center">
          {version && `v${version}`}
        </div>
      </div>
    </aside>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={cycleTheme}
      title={`当前: ${theme === "system" ? "跟随系统" : theme === "light" ? "浅色" : "深色"}`}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}
