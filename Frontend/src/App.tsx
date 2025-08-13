import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { ChatProvider } from "./contexts/ChatContext";
import { Sidebar } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DeepLearning from "./pages/DeepLearning";
import Notebook from "./pages/Notebook";
import YouTubePlayground from "./pages/YouTubePlayground";

const queryClient = new QueryClient();

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
    filter: "blur(2px)"
  },
  in: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)"
  },
  out: {
    opacity: 0,
    y: -10,
    filter: "blur(2px)"
  }
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
  duration: 0.35
};

const AppLayout = () => {
  const location = useLocation();
  const isNotebookPage = location.pathname.startsWith('/notebook/');
  const isPlaygroundPage = location.pathname.startsWith('/playground/');
  
  return (
    <div className="h-screen bg-background flex">
      {!isNotebookPage && !isPlaygroundPage && <Sidebar />}
      <AnimatedRoutes />
      <ThemeToggle />
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="flex-1 relative overflow-y-auto"
            >
              <Index />
            </motion.div>
          } 
        />
        <Route 
          path="/deep-learning" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="flex-1 relative overflow-y-auto"
            >
              <DeepLearning />
            </motion.div>
          } 
        />
        <Route 
          path="/notebook/:id" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full relative overflow-y-auto"
            >
              <Notebook />
            </motion.div>
          } 
        />
        <Route 
          path="/playground/:videoId" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full relative overflow-y-auto"
            >
              <YouTubePlayground />
            </motion.div>
          } 
        />
        <Route 
          path="*" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="flex-1 relative overflow-y-auto"
            >
              <NotFound />
            </motion.div>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <ChatProvider>
            <AppLayout />
          </ChatProvider>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
