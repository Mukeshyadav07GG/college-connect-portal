import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index.tsx";

const StudentDashboard = lazy(() => import("./pages/StudentDashboard.tsx"));
const FacultyDashboard = lazy(() => import("./pages/FacultyDashboard.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const ChangePassword = lazy(() => import("./pages/ChangePassword.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/student/*" element={<StudentDashboard />} />
                <Route path="/faculty/*" element={<FacultyDashboard />} />
                <Route path="/admin/*" element={<AdminDashboard />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
