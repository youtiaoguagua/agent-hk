import { ChevronDown, ChevronRight, Play, Lock, Folder } from "lucide-react";
import { useState } from "react";
import type { RulesSubMenuItem, OtherEventItem } from "@/types";
import { otherEventItems } from "@/types";

interface RulesSidebarProps {
  activeSubMenu: RulesSubMenuItem;
  activeOtherEvent: OtherEventItem;
  onSubMenuChange: (menu: RulesSubMenuItem) => void;
  onOtherEventChange: (event: OtherEventItem) => void;
}

const subMenuItems: { id: RulesSubMenuItem; label: string; icon: typeof Play; description: string }[] = [
  { id: "pretooluse", label: "PreToolUse", icon: Play, description: "工具执行前" },
  { id: "permissionrequest", label: "PermissionRequest", icon: Lock, description: "权限请求" },
  { id: "otherevents", label: "其他事件", icon: Folder, description: "更多事件" },
];

export function RulesSidebar({
  activeSubMenu,
  activeOtherEvent,
  onSubMenuChange,
  onOtherEventChange,
}: RulesSidebarProps) {
  const [otherEventsExpanded, setOtherEventsExpanded] = useState(
    activeSubMenu === "otherevents"
  );

  const handleSubMenuClick = (id: RulesSubMenuItem) => {
    onSubMenuChange(id);
    if (id === "otherevents") {
      setOtherEventsExpanded(true);
    }
  };

  const handleOtherEventClick = (eventId: OtherEventItem) => {
    onSubMenuChange("otherevents");
    onOtherEventChange(eventId);
    setOtherEventsExpanded(true);
  };

  return (
    <aside className="w-56 bg-muted/30 border-r border-border flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">规则配置</h2>
        <p className="text-xs text-muted-foreground mt-0.5">按事件类型配置</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-2">
        {subMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSubMenu === item.id;
          const isOtherEvents = item.id === "otherevents";

          return (
            <div key={item.id}>
              <button
                onClick={() => handleSubMenuClick(item.id)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                  ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {item.description}
                  </div>
                </div>
                {isOtherEvents && (
                  otherEventsExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                )}
              </button>

              {/* Other Events Submenu */}
              {isOtherEvents && otherEventsExpanded && (
                <div className="ml-2 mt-1 space-y-0.5 border-l border-border pl-2 max-h-[calc(100vh-260px)] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50">
                  {otherEventItems.map((event) => {
                    const isEventActive = activeSubMenu === "otherevents" && activeOtherEvent === event.id;
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleOtherEventClick(event.id)}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all duration-200
                          ${isEventActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }
                        `}
                        title={event.description}
                      >
                        <span className="truncate">{event.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
