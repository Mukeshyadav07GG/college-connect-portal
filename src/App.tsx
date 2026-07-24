import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Component, lazy, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index.tsx";

const lazyWithRetry = (loader: () => Promise<{ default: ComponentType }>, key: string) =>
  lazy(async () => {
    try {
      const mod = await loader();
      sessionStorage.removeItem(`chunk-retry:${key}`);
      return mod;
    } catch (error) {
      const retryKey = `chunk-retry:${key}`;
      if (sessionStorage.getItem(retryKey) !== "1") {
        sessionStorage.setItem(retryKey, "1");
        window.location.reload();
      }
      throw error;
    }
  });

const StudentDashboard = lazyWithRetry(() => import("./pages/StudentDashboard.tsx"), "student-dashboard");
const FacultyDashboard = lazyWithRetry(() => import("./pages/FacultyDashboard.tsx"), "faculty-dashboard");
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard.tsx"), "admin-dashboard");
const ChangePassword = lazyWithRetry(() => import("./pages/ChangePassword.tsx"), "change-password");
const Login = lazyWithRetry(() => import("./pages/Login.tsx"), "login");
const OAuthConsent = lazyWithRetry(() => import("./pages/OAuthConsent.tsx"), "oauth-consent");
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"), "not-found");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>
);

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render failed", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
        <div className="glass-strong max-w-sm rounded-2xl p-6 shadow-soft">
          <h1 className="font-display text-xl font-bold text-foreground">Preview reload needed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A cached app file failed to load. Reload once to restore the latest preview.
          </p>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Reload preview
          </Button>
        </div>
      </div>
    );
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" />
          <BrowserRouter>
            <AppErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/student/*" element={<StudentDashboard />} />
                  <Route path="/faculty/*" element={<FacultyDashboard />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AppErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
