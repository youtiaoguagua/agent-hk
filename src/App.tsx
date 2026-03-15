import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { RulesSidebar } from "@/components/rules-sidebar";
import { PreToolUsePanel } from "@/components/panels/pretooluse-panel";
import { PermissionRequestPanel } from "@/components/panels/permissionrequest-panel";
import { OtherEventPanel } from "@/components/panels/other-event-panel";
import { GeneralPanel } from "@/components/panels/general-panel";
import { NotificationsPanel } from "@/components/panels/notifications-panel";
import { HookPanel } from "@/components/panels/hook-panel";
import { NotificationSettingsPanel } from "@/components/panels/notification-settings-panel";
import { WebhookPanel } from "@/components/panels/webhook-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RuleConfig, MainMenuItem, RulesSubMenuItem, OtherEventItem } from "@/types";
import { createDefaultConfig, migrateFromLegacyConfig } from "@/types";
import { Toaster, toast } from "sonner";
import "./App.css";

// 检查是否是旧配置格式
function isLegacyConfig(config: unknown): boolean {
  return (
    typeof config === "object" &&
    config !== null &&
    "mode" in config &&
    (config as { mode?: string }).mode !== undefined
  );
}

function AppContent() {
  const [activeMainMenu, setActiveMainMenu] = useState<MainMenuItem>("rules");
  const [activeRulesSubMenu, setActiveRulesSubMenu] = useState<RulesSubMenuItem>("pretooluse");
  const [activeOtherEvent, setActiveOtherEvent] = useState<OtherEventItem>("PostToolUse");
  const [config, setConfig] = useState<RuleConfig>(createDefaultConfig());

  // 加载配置的函数
  const loadConfig = () => {
    invoke<RuleConfig | { mode: string }>("get_config")
      .then((loadedConfig) => {
        // 迁移旧配置
        if (isLegacyConfig(loadedConfig)) {
          const migrated = migrateFromLegacyConfig(loadedConfig as { mode: "Whitelist" | "Blacklist"; tool_rules: { tool_name: string; enabled: boolean }[]; content_rules: { pattern: string; match_type: string; enabled: boolean }[]; auto_allow_unmatched: boolean });
          setConfig(migrated);
          // 自动保存迁移后的配置
          invoke("update_config", { config: migrated }).catch(console.error);
        } else {
          setConfig(loadedConfig as RuleConfig);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // 切换子菜单时重新加载配置
  const handleSubMenuChange = (menu: RulesSubMenuItem) => {
    setActiveRulesSubMenu(menu);
    loadConfig(); // 丢弃未保存的修改，重新加载已保存的配置
  };

  // 切换其他事件时重新加载配置
  const handleOtherEventChange = (event: OtherEventItem) => {
    setActiveOtherEvent(event);
    loadConfig(); // 丢弃未保存的修改，重新加载已保存的配置
  };

  const saveConfig = () => {
    invoke("update_config", { config })
      .then(() => toast.success("配置已保存"))
      .catch((e) => toast.error("保存失败: " + e));
  };

  // 更新 PreToolUse 配置
  const updatePreToolUse = (updates: Partial<RuleConfig["pretooluse"]>) => {
    setConfig((prev) => ({
      ...prev,
      pretooluse: { ...prev.pretooluse, ...updates },
    }));
  };

  // 更新其他事件配置
  const updateOtherEvent = (eventName: OtherEventItem, updates: Partial<RuleConfig["other_events"][string]>) => {
    setConfig((prev) => ({
      ...prev,
      other_events: {
        ...prev.other_events,
        [eventName]: { ...prev.other_events[eventName], ...updates },
      },
    }));
  };

  // 更新通知设置
  const updateNotificationSettings = (settings: RuleConfig["notification_settings"]) => {
    setConfig((prev) => ({
      ...prev,
      notification_settings: settings,
    }));
  };

  // 渲染主内容区
  const renderContent = () => {
    switch (activeMainMenu) {
      case "rules":
        switch (activeRulesSubMenu) {
          case "pretooluse":
            return (
              <PreToolUsePanel
                config={config.pretooluse}
                onChange={updatePreToolUse}
                onSave={saveConfig}
              />
            );
          case "permissionrequest":
            return <PermissionRequestPanel />;
          case "otherevents":
            return (
              <OtherEventPanel
                eventName={activeOtherEvent}
                config={config.other_events[activeOtherEvent]}
                onChange={(updates) => updateOtherEvent(activeOtherEvent, updates)}
                onSave={saveConfig}
                onEventChange={setActiveOtherEvent}
              />
            );
          default:
            return null;
        }
      case "hook":
        return <HookPanel />;
      case "notifications":
        return <NotificationsPanel />;
      case "notification_settings":
        return (
          <NotificationSettingsPanel
            settings={config.notification_settings}
            onChange={updateNotificationSettings}
            onSave={saveConfig}
          />
        );
      case "general":
        return (
          <GeneralPanel
            settings={config.general_settings}
            onChange={(updates) => {
              setConfig((prev) => {
                const next = {
                  ...prev,
                  general_settings: { ...prev.general_settings, ...updates },
                };
                invoke("update_config", { config: next }).catch((e) =>
                  toast.error("保存失败: " + e)
                );
                return next;
              });
            }}
          />
        );
      case "webhook":
        return (
          <WebhookPanel
            settings={config.webhook_settings}
            onChange={(updates) => {
              setConfig((prev) => {
                const next = {
                  ...prev,
                  webhook_settings: { ...prev.webhook_settings, ...updates },
                };
                invoke("update_config", { config: next }).catch((e) =>
                  toast.error("保存失败: " + e)
                );
                return next;
              });
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* 一级侧边栏 */}
      <Sidebar
        activeMenu={activeMainMenu}
        onMenuChange={setActiveMainMenu}
      />

      {/* 规则二级侧边栏（仅在规则菜单显示） */}
      {activeMainMenu === "rules" && (
        <RulesSidebar
          activeSubMenu={activeRulesSubMenu}
          activeOtherEvent={activeOtherEvent}
          onSubMenuChange={handleSubMenuChange}
          onOtherEventChange={handleOtherEventChange}
        />
      )}

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-4xl mx-auto p-6">
            {renderContent()}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

function AppContentWrapper() {
  const { resolvedTheme } = useTheme();

  return (
    <>
      <AppContent />
      <Toaster
        position="top-center"
        closeButton
        theme={resolvedTheme}
        visibleToasts={2}
        toastOptions={{
          style: {
            fontSize: "13px",
            padding: "10px 14px",
            maxWidth: "250px",
            left: "60px",
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <AppContentWrapper />
    </ThemeProvider>
  );
}

export default App;
