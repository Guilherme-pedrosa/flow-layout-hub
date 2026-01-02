import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { AIAssistant } from "@/components/shared/AIAssistant";
import { WaiAlertBanner } from "@/components/wai-observer/WaiAlertBanner";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
      setMobileOpen(false);
    }
  }, [isMobile]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen w-full bg-muted">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <AppSidebar 
        collapsed={isMobile ? false : collapsed} 
        onToggle={() => isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-200",
          isMobile ? "ml-0" : (collapsed ? "ml-16" : "ml-60")
        )}
      >
        <AppHeader 
          onMenuClick={() => setMobileOpen(true)} 
          showMenuButton={isMobile}
        />
        
        {/* Content area with padding and max-width */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden page-enter">
          <div className="mx-auto max-w-7xl space-y-4">
            {/* WAI Observer Alert Banner - Global */}
            <WaiAlertBanner className="mb-2" />
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Assistant disponível em todas as páginas */}
      <AIAssistant />
    </div>
  );
}
