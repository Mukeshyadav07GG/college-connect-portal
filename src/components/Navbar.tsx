import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GraduationCap, Menu, Moon, Sun, LogOut, LayoutDashboard } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { LoginModal } from "./LoginModal";
import { useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home", id: "hero" },
  { label: "About", id: "about" },
  { label: "Courses", id: "courses" },
  { label: "Campus", id: "campus" },
  { label: "Hostel", id: "hostel" },
  { label: "Calendar", id: "calendar" },
  { label: "Contact", id: "contact" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  const goToDashboard = () => {
    if (role === "student") navigate("/student");
    else if (role === "faculty") navigate("/faculty");
    else if (role === "admin") navigate("/admin");
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? "glass-strong py-2" : "py-4 bg-transparent"}`}>
        <div className="container flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-display font-bold text-sm leading-tight">KNMIET</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Modinagar · AKTU</div>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors">
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {user ? (
              <>
                <Button onClick={goToDashboard} variant="outline" size="sm" className="hidden sm:inline-flex">
                  <LayoutDashboard className="w-4 h-4 mr-1.5" /> Dashboard
                </Button>
                <Button onClick={signOut} variant="ghost" size="icon" aria-label="Sign out">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button onClick={() => setLoginOpen(true)} className="glow-button animate-pulse-glow font-medium">
                Login
              </Button>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-strong w-72">
                <nav className="flex flex-col gap-1 mt-8">
                  {NAV_LINKS.map((l) => (
                    <button key={l.id} onClick={() => scrollTo(l.id)} className="px-4 py-3 text-left font-medium hover:bg-primary/10 rounded-lg transition-colors">
                      {l.label}
                    </button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
};
