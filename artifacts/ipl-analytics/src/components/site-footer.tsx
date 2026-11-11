import { Link } from "wouter";
import CricFieldLogo from "@/components/CricFieldLogo";
import { useTeamTheme } from "@/lib/team-context";
import { FRANCHISE_THEMES } from "@/lib/franchiseColors";
import "./site-footer.css";

const sections = [
  {
    title: "Information",
    links: [
      ["About Us", "/about"],
      ["Contact Us", "/contact"],
      ["Sitemap", "/sitemap.xml"],
    ],
  },
  {
    title: "Legal & Privacy",
    links: [
      ["Privacy Policy", "/privacy"],
      ["Terms of Use", "/terms"],
      ["Cookie Settings", "/privacy#cookie-settings"],
      ["Disclaimer", "/disclaimer"],
      ["Account & Data Deletion", "/privacy#data-deletion"],
    ],
  },
];

const socialProfiles: [string, string][] = [
  ["X", "https://x.com"],
  ["Instagram", "https://instagram.com"],
  ["YouTube", "https://youtube.com"],
  ["LinkedIn", "https://linkedin.com"],
];

export function SiteFooter() {
  const { selectedTeam } = useTeamTheme();
  const accentColor = (FRANCHISE_THEMES[selectedTeam?.toLowerCase() ?? "default"] ?? FRANCHISE_THEMES.default).primary;

  return (
    <footer className="cricfield-footer cf-footer-utility">
      <div className="cf-footer-container max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        {/* CricField Brand Hero Showcase Card */}
        <div className="flex justify-center py-6 mb-8 bg-[#070e17] rounded-3xl border border-white/10 p-6 sm:p-10 shadow-2xl">
          <CricFieldLogo
            variant="footer"
            accentColor={accentColor}
          />
        </div>

        {/* Links Grid: Information, Legal & Privacy, Follow CricField */}
        <div className="cf-footer-links">
          {sections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.links.map(([label, href]) => (
                  <li key={label}>
                    {href === "/sitemap.xml" ? (
                      <a href={`${import.meta.env.BASE_URL}sitemap.xml`}>{label}</a>
                    ) : (
                      <Link href={href}>{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Follow CricField (X, Instagram, YouTube, LinkedIn) */}
          <nav aria-label="Social media profiles">
            <h3>Follow CricField</h3>
            <ul className="cf-social-links">
              {socialProfiles.map(([name, url]) => (
                <li key={name}>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cf-social-link"
                    >
                      {name}
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  ) : (
                    <span className="cf-social-link-disabled">
                      {name}
                      <span className="sr-only"> — profile not connected</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Bar with Grounded Compact Wordmark */}
        <div className="cf-footer-bottom border-t border-white/10 mt-8 pt-6 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <CricFieldLogo variant="compact" accentColor={accentColor} />
            <span className="text-white/20 hidden sm:inline">|</span>
            <span className="tracking-wider uppercase text-[10px] text-white/60 hidden sm:inline">
              IPL Global Intelligence
            </span>
          </div>
          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            © {new Date().getFullYear()} CricField. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
