import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import reactHotToast, { Toaster, useToasterStore } from "react-hot-toast";
import "./App.css";
import "./notification.css";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { info, attachConsole } from "@tauri-apps/plugin-log";
import { X, Terminal, Shield } from "lucide-react";

// 后端发送的通知格式
interface NotificationPayload {
  type: "hook";
  action?: "notify" | "decide";
  title?: string;
  notificationType?: "success" | "error" | "warning" | "info" | "default";
  description?: string;
  requestId?: string;
  hookEventName?: string;
  eventData?: {
    tool_name?: string;
    tool_input?: {
      command?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

// Hook 通知组件
function HookNotification({
  requestId,
  hookEventName,
  eventData,
  action,
  theme,
}: {
  requestId: string;
  hookEventName: string;
  eventData: {
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    [key: string]: unknown;
  };
  action: "notify" | "decide";
  theme: "light" | "dark";
}) {
  const toolName = eventData.tool_name || hookEventName;
  const command = eventData.tool_input?.command as string | undefined;
  const isDark = theme === "dark";

  const handleDecision = async (decision: "allow" | "deny" | null) => {
    await invoke("submit_decision", { requestId, decision });
    reactHotToast.dismiss(requestId);
  };

  info(`[Frontend] Displaying hook notification: ${hookEventName} (${requestId}), action: ${action}`);

  return (
    <div className={`w-[320px] overflow-hidden rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.15)] ring-1 ${isDark ? 'bg-slate-900 ring-slate-700' : 'bg-white ring-slate-200'}`}>
      <div className="flex items-start gap-3 p-3">
        <div
          className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-md shadow-sm ${isDark ? 'bg-slate-800' : 'bg-indigo-50'}`}
        >
          <Shield className={`h-4 w-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={`text-sm font-medium drop-shadow-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {hookEventName === "PreToolUse" ? "需要授权" : hookEventName}
          </p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {toolName || "操作需要确认"}
          </p>
        </div>
        <button
          onClick={() => {
            if (action === "decide") {
              handleDecision(null);
            } else {
              reactHotToast.dismiss(requestId);
            }
          }}
          className={`flex-shrink-0 -mr-1 -mt-1 rounded p-1 transition-all ${isDark ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {command && (
        <div className="mx-3 mb-2">
          <div className={`rounded px-2.5 py-2 ${isDark ? 'bg-slate-800 shadow-inner' : 'bg-slate-900 shadow-inner'}`}>
            <div className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              <Terminal className="h-3 w-3" />
              <span className="text-[10px] uppercase">Command</span>
            </div>
            <code className={`mt-1 block font-mono text-[11px] leading-tight ${isDark ? 'text-slate-300' : 'text-slate-300'}`}>
              {command.length > 50 ? command.slice(0, 50) + "..." : command}
            </code>
          </div>
        </div>
      )}

      {action === "decide" && (
        <div className={`flex gap-2 border-t p-2.5 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <button
            onClick={() => handleDecision("deny")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            拒绝
          </button>
          <button
            onClick={() => handleDecision("allow")}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-all ${isDark ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            允许
          </button>
        </div>
      )}
    </div>
  );
}


// 将预设位置映射到 react-hot-toast 位置
function mapPresetToPosition(preset: string): "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" {
  const positionMap: Record<string, "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"> = {
    "top_left": "top-left",
    "top_center": "top-center",
    "top_right": "top-right",
    "left_center": "top-left",
    "right_center": "top-right",
    "bottom_left": "bottom-left",
    "bottom_center": "bottom-center",
    "bottom_right": "bottom-right",
  };
  return positionMap[preset] || "top-right";
}

// 显示 Hook 通知
function showHookNotification(
  requestId: string,
  hookEventName: string,
  eventData: {
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    [key: string]: unknown;
  },
  action: "notify" | "decide",
  theme: "light" | "dark"
) {
  reactHotToast(
    <HookNotification
      requestId={requestId}
      hookEventName={hookEventName}
      eventData={eventData}
      action={action}
      theme={theme}
    />,
    {
      id: requestId,
      duration: action === "decide" ? 30000 : 3000,
      position: "top-right",
    }
  );
}

function NotificationApp() {
  const { toasts } = useToasterStore();
  const visibleCount = toasts.filter((t) => t.visible).length;
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [positionConfig, setPositionConfig] = useState({
    preset: "top_right",
    offset_x: 0,
    offset_y: 50,
  });
  const [screenConfig, setScreenConfig] = useState<{ type: "screen_index"; index: number }>({ type: "screen_index", index: 0 });
  const [isReady, setIsReady] = useState(false);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await invoke<{
          notification_settings: {
            theme: "light" | "dark";
            position: { preset: string; offset_x: number; offset_y: number };
            screen: { type: "screen_index"; index: number };
          };
        }>("get_config");
        if (result.notification_settings) {
          setTheme(result.notification_settings.theme);
          setPositionConfig(result.notification_settings.position);
          setScreenConfig(result.notification_settings.screen);
        }
      } catch (e) {
        console.error("Failed to load config:", e);
      }
      setIsReady(true);
    };
    loadConfig();
  }, []);

  useEffect(() => {
    const update = async () => {
      if (visibleCount === 0) {
        await new Promise(r => setTimeout(r, 100));
        await invoke("hide_notification_window");
        await info("[Frontend] All toasts dismissed, window hidden");
      }
    };
    update();
  }, [visibleCount]);

  useEffect(() => {
    if (!isReady) return;

    attachConsole();

    const unlisten = listen<NotificationPayload>(
      "show-notification",
      async (event) => {
        const payload = event.payload;
        await info(`[Frontend] Received notification: ${JSON.stringify(payload)}`);

        // 每次显示通知前重新加载配置
        let currentSettings = {
          theme: theme,
          position: positionConfig,
          screen: screenConfig,
        };
        try {
          const result = await invoke<{
            notification_settings: {
              theme: "light" | "dark";
              position: { preset: string; offset_x: number; offset_y: number };
              screen: { type: "screen_index"; index: number };
            };
          }>("get_config");
          if (result.notification_settings) {
            currentSettings = result.notification_settings;
            setTheme(result.notification_settings.theme);
            setPositionConfig(result.notification_settings.position);
            setScreenConfig(result.notification_settings.screen);
          }
        } catch (e) {
          console.error("Failed to reload config:", e);
        }

        // 调用后端定位窗口
        try {
          await invoke("position_notification_window", {
            screenIndex: currentSettings.screen.index,
            positionPreset: currentSettings.position.preset,
            offsetX: currentSettings.position.offset_x,
            offsetY: currentSettings.position.offset_y,
          });
          await info("[Frontend] Window positioned via backend");
        } catch (e) {
          console.error("Failed to position window:", e);
        }

        showHookNotification(
            payload.requestId || `${Date.now()}`,
            payload.hookEventName || "Unknown",
            payload.eventData || {},
            payload.action || "notify",
            currentSettings.theme
        );
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [isReady, theme, positionConfig, screenConfig]);

  return (
    <Toaster
      position={mapPresetToPosition(positionConfig.preset)}
      toastOptions={{
        duration: 3000,
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          maxWidth: "none",
        },
      }}
      containerStyle={{
        top: 16 + positionConfig.offset_y,
        right: 16 + positionConfig.offset_x,
        left: 16 + positionConfig.offset_x,
        bottom: 16 + positionConfig.offset_y,
      }}
      gutter={8}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <NotificationApp />
  </React.StrictMode>,
);
