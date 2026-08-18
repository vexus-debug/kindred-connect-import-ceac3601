import { ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { AICopilotPanel } from "./AICopilotPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigationType } from "react-router-dom";
import { Stethoscope, LayoutDashboard, ClipboardPlus } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const springTransition = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
  mass: 0.8,
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navType = useNavigationType();
  const isBack = navType === "POP";

  const pageVariants = {
    initial: { opacity: 0, x: isBack ? -40 : 40, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: isBack ? 40 : -40, scale: 0.98 },
  };

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden dashboard-bg">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col h-full overflow-hidden">
          <DashboardHeader onToggleAI={() => setAiOpen(!aiOpen)} aiOpen={aiOpen} />

          {isMobile ? (
            <>
              <AnimatePresence mode="wait">
                {!aiOpen ? (
                  <motion.main
                    key="dashboard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 overflow-y-auto overscroll-contain p-4 scroll-momentum"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={location.pathname}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={springTransition}
                        className="gpu-accelerated"
                      >
                        {children}
                      </motion.div>
                    </AnimatePresence>
                  </motion.main>
                ) : (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    <AICopilotPanel open={true} onClose={() => setAiOpen(false)} inline />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile bottom toggle */}
              <div className="relative flex items-center border-t border-border bg-background shrink-0">
                {/* Floating AI hint — only when AI tab is not active */}
                <AnimatePresence>
                  {!aiOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="absolute right-[25%] -translate-x-1/2 -top-10 pointer-events-none z-10"
                    >
                      <div className="relative flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg shadow-primary/25">
                        <ClipboardPlus className="w-3 h-3" />
                        <span>Try AI</span>
                        {/* Caret */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45 rounded-[1px]" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setAiOpen(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    !aiOpen
                      ? "text-primary border-t-2 border-primary -mt-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setAiOpen(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                    aiOpen
                      ? "text-primary border-t-2 border-primary -mt-px"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  AI Chat
                  {/* Subtle pulse dot */}
                  {!aiOpen && (
                    <span className="absolute top-2 right-[calc(50%-28px)] w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <main className="flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6 scroll-momentum">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={springTransition}
                    className="gpu-accelerated"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </main>
              <AICopilotPanel open={aiOpen} onClose={() => setAiOpen(false)} />
            </>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
