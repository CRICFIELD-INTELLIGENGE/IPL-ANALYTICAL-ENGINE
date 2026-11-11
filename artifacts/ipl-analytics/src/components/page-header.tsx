import { Download, Printer, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  lastRefreshed?: string;
  dataSources?: string[];
}

export function PageHeader({ title, subtitle, lastRefreshed, dataSources = ["IPL API"] }: PageHeaderProps) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDark(document.documentElement.classList.contains("dark"));
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-x-4 gap-y-4 border-b border-border/40 pb-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-2 text-base">{subtitle}</p>}
        
        {dataSources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Sources:
            </span>
            {dataSources.map((source) => (
              <span
                key={source}
                className="text-xs font-semibold rounded px-2 py-0.5 bg-secondary text-secondary-foreground"
              >
                {source}
              </span>
            ))}
          </div>
        )}
        
        {lastRefreshed && (
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {lastRefreshed}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center w-9 h-9 rounded-md transition-colors bg-secondary hover:bg-secondary/80 text-secondary-foreground"
          aria-label="Export as PDF"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
