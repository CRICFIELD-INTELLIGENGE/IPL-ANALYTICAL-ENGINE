import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Sun, Moon, LayoutDashboard, TrendingUp, DollarSign, Award, Home } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [location] = useLocation();

  useEffect(() => {
    // Default to dark mode
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/stats", label: "On-Field Stats", icon: TrendingUp },
    { href: "/dashboard", label: "Analytics", icon: LayoutDashboard },
    { href: "/business", label: "Business", icon: DollarSign },
    { href: "/records", label: "Records", icon: Award },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground">
                IPL
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:inline-block">
                Analytics Engine
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location === item.href
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <button
            onClick={() => setIsDark((d) => !d)}
            className="flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-secondary"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
