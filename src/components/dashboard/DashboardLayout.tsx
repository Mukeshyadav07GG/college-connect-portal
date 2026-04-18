import { ReactNode, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { FloatingChat } from "@/components/FloatingChat";
import { toast } from "sonner";

interface NavItem { to: string; label: string; icon: ReactNode; }

interface Props {
  children: ReactNode;
  title: string;
  items: NavItem[];
  requiredRole: AppRole;
}

export const DashboardLayout = ({ children, title, items, requiredRole }: Props) => {
  const { profile, role, loading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!profile || role !== requiredRole)) {
      toast.error("Access denied");
      navigate("/");
    }
  }, [loading, profile, role, requiredRole, navigate]);

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  const Sidebar = () => (
    <aside className="w-64 h-full bg-card/50 backdrop-blur-xl border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">{title}</h2>
        <p className="text-xs text-muted-foreground mt-1">{profile.full_name}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
          {theme === "dark" ? "Light" : "Dark"} mode
        </Button>
        <Button variant="ghost" className="w-full justify-start text-destructive" onClick={async () => { await signOut(); navigate("/"); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden md:block"><Sidebar /></div>
      <div className="md:hidden fixed top-3 left-3 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon"><Menu className="h-4 w-4" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64"><Sidebar /></SheetContent>
        </Sheet>
      </div>
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</main>
      <FloatingChat />
    </div>
  );
};
