import { useEffect, ReactNode, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  GraduationCap, User, Calendar as CalIcon, Users, FileText, BookOpen,
  BarChart3, Building2, PartyPopper, Megaphone, LogOut, Menu, Sun, Moon, Home, CalendarCheck, KeyRound, Wallet, ArrowLeft,
} from "lucide-react";
import { lazy, Suspense } from "react";
const FloatingChat = lazy(() => import("@/components/FloatingChat").then(m => ({ default: m.FloatingChat })));

interface NavItem { to: string; label: string; icon: any; }

const NAV: NavItem[] = [
  { to: "/student", label: "My Profile", icon: User },
  { to: "/student/timetable", label: "Time Table", icon: CalIcon },
  { to: "/student/faculty", label: "Faculty", icon: Users },
  { to: "/student/assignments", label: "Assignments", icon: FileText },
  { to: "/student/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/student/syllabus", label: "Syllabus", icon: BookOpen },
  { to: "/student/result", label: "Result", icon: BarChart3 },
  { to: "/student/hostel", label: "Hostel", icon: Building2 },
  { to: "/student/events", label: "Events", icon: PartyPopper },
  { to: "/student/announcements", label: "Announcements", icon: Megaphone },
  { to: "/student/fees", label: "Fees & Documents", icon: Wallet },
];

export const StudentLayout = ({ children }: { children?: ReactNode }) => {
  const { user, profile, role, loading, profileLoading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!user || role !== "student") navigate("/");
  }, [user, role, loading, profileLoading, navigate]);

  const isRoot = location.pathname === "/student" || location.pathname === "/student/";

  // Esc key to go back to /student from any sub-page
  useEffect(() => {
    if (isRoot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      // Ignore when typing in inputs or when a dialog/sheet is open
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      e.preventDefault();
      navigate(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRoot, navigate]);

  if (loading || profileLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-glow">
          <GraduationCap className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <div className="font-display font-bold text-sm leading-tight">KNMIET</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Student Portal</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? "gradient-bg text-primary-foreground shadow-glow" : "hover:bg-primary/10 text-foreground/80"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-primary/10 text-muted-foreground transition-all hover:translate-x-1">
          <Home className="w-4 h-4" /> Public Site
        </Link>
        <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-primary/10 text-muted-foreground transition-all hover:translate-x-1">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button onClick={() => { setMobileOpen(false); navigate("/change-password"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-primary/10 text-muted-foreground transition-all hover:translate-x-1">
          <KeyRound className="w-4 h-4" /> Change Password
        </button>
        <button onClick={() => { signOut(); navigate("/"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-destructive/10 text-destructive transition-all hover:translate-x-1">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 glass-strong border-r border-border fixed h-screen">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="glass-strong border-b border-border h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0"><SidebarContent /></SheetContent>
            </Sheet>
            {!isRoot && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                aria-label="Go back (Esc)"
                title="Go back (Esc)"
                className="gap-1.5 -ml-1 hover:bg-primary/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Back</span>
                <kbd className="hidden md:inline ml-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">Esc</kbd>
              </Button>
            )}
            <div>
              <div className="text-xs text-muted-foreground">Welcome back,</div>
              <div className="font-display font-bold text-sm">{profile?.full_name ?? "Student"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Roll No.</div>
              <div className="text-xs font-mono font-semibold">{profile?.roll_number ?? "—"}</div>
            </div>
            <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-sm shadow-glow">
              {(profile?.full_name ?? "S").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div key={location.pathname} className="animate-page-enter">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
      <Suspense fallback={null}><FloatingChat /></Suspense>
    </div>
  );
};
