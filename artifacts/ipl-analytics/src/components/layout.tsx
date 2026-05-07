import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Bell, User } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/stats", label: "Stats" },
    { href: "/dashboard", label: "Analytics" },
    { href: "/business", label: "Business" },
    { href: "/records", label: "Records" },
  ];

  const subNavItems = [
    "Live Scores", "Schedule", "Series", "Teams", "Players", "Rankings", "News", "Videos", "Photos", "Stats Corner"
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top red brand bar */}
      <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded bg-white text-primary flex items-center justify-center font-black text-sm tracking-tight">
                IPL
              </div>
              <div className="leading-tight">
                <div className="font-bold text-lg tracking-tight">CricStats</div>
                <div className="text-[10px] uppercase tracking-widest opacity-80 -mt-0.5">Analytics Engine</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded text-sm font-semibold transition-colors ${
                    location === item.href
                      ? "bg-white/15"
                      : "hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 text-sm transition">
              <Search className="w-4 h-4" />
              <span className="hidden lg:inline opacity-80">Search players, teams...</span>
            </button>
            <button className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition">
              <Bell className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition">
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Sub-navigation strip */}
      <div className="border-b border-border bg-card sticky top-14 z-40">
        <div className="max-w-[1400px] mx-auto px-4 h-10 flex items-center gap-6 overflow-x-auto">
          {subNavItems.map((item, i) => (
            <a
              key={item}
              href="#"
              className={`text-xs font-semibold uppercase tracking-wider whitespace-nowrap py-2.5 border-b-2 transition-colors ${
                i === 0
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {item}
            </a>
          ))}
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="mt-12 border-t border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-4 py-8 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>© 2026 CricStats Analytics Engine — IPL data 2008–2025</div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">About</a>
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
