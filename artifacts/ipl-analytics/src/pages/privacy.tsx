import { denyConsent, grantConsent, hasAnalytics, hasAds } from "@/lib/analytics";
/**
 * PRIVACY — what the site does and doesn't collect. Kept in step with
 * src/lib/analytics.ts (consent-gated Google tags), the API request logger
 * (method, path, status only), the article click counter and the consent-gated
 * Getty Images Embedded Viewer (src/lib/embed-consent.ts).
 */

import { Bullets, InLink, InfoPage, Section } from "@/components/site/info-page";
import { SITE } from "@/lib/site-profile";
import { resetEmbedConsent, grantEmbedConsent, denyEmbedConsent, useEmbedConsent } from "@/lib/embed-consent";

function EmbedChoice() {
  const consent = useEmbedConsent();
  const btn = "rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10";
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-white/60">
        Embedded photos are currently{" "}
        <b className="text-white">{consent === "granted" ? "allowed" : consent === "denied" ? "blocked" : "not yet decided"}</b>.
      </span>
      {consent !== "granted" && <button type="button" className={btn} onClick={grantEmbedConsent}>Allow Getty photos</button>}
      {consent !== "denied" && <button type="button" className={btn} onClick={denyEmbedConsent}>Block Getty photos</button>}
      {consent !== null && <button type="button" className={btn} onClick={resetEmbedConsent}>Ask me again</button>}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy"
      intro={<>The short version: browsing does not require an account. Optional accounts, when enabled, use Supabase to handle sign-in and store your email and display name. Analytics and advertising cookies, and embedded photographs from Getty Images, load only if you accept them.</>}
      updated="29 October 2026"
    >
      <Section title="What the site's own server keeps">
        <Bullets items={[
          "Request logs record the method, the page or API path (without query strings) and the response status, to keep the site running. They do not record IP addresses or cookies.",
          "Clicks on articles in the insights section are counted per article, with the time of the last click. Nothing about who clicked is stored.",
          "Questions typed into Ask the database are sent to the server to be answered and are not saved.",
          "Messages in the auction game's room chat are held in the server's memory while the session runs and are not saved.",
        ]} />
        <p>The hosting provider may keep its own standard access logs under its own privacy policy.</p>
      </Section>

      <div id="cookie-settings" className="scroll-mt-20" /><Section title="Cookies, analytics and advertising">
        {(hasAnalytics || hasAds) && <div className="flex flex-wrap gap-3"><button className="border rounded p-3" onClick={()=>void grantConsent()}>Allow Google services</button><button className="border rounded p-3" onClick={denyConsent}>Block Google services</button></div>}
        <p>Advertising also requires a configured certified consent platform. Use its privacy control to change advertising purposes. Blocking Google services here prevents future ad requests and reloads the page if a tag was already loaded. Previously collected data is not deleted by this choice.</p>
        <p>The site can use Google Analytics 4 (to count visits) and Google AdSense (to show ads). Neither loads unless it has been configured and you choose <b className="text-white">Accept</b> in the cookie banner. If you choose <b className="text-white">Decline</b>, no Google tag loads and the site works exactly the same. If neither is configured, no banner appears because there is nothing to consent to.</p>
        <p>Your choice is stored in your own browser (local storage) so you aren't asked again. Use the controls above to change it. Clearing your browser's site data also resets it. Data collected by Google after you accept is handled under <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2">Google's privacy policy</a>.</p>
      </Section>

      <Section title="Embedded photographs from Getty Images">
        <p>Some Dugout articles show news photographs through Getty Images' official Embedded Viewer. The viewer is third-party content: when it loads, your browser requests a script and an image frame from Getty Images' servers, and Getty Images (or companies acting for it) may collect data about that use, set cookies or similar identifiers, and show its own advertising inside the viewer. CricField does not control or receive that data.</p>
        <p>No Getty content is requested until you choose <b className="text-white">Accept</b> in the cookie banner or <b className="text-white">Show photos</b> on an article. If you decline, articles show original CricField illustrations instead. Each embedded photograph keeps Getty's own attribution and links to its page on Getty Images. Data collected through the viewer is handled under <a href="https://www.gettyimages.com/company/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2">Getty Images' privacy policy</a>; its use is governed by <a href="https://www.gettyimages.com/company/terms" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2">Getty Images' site terms</a>.</p>
        <p>Advertising and sponsor modules are separate from editorial photographs. Only photographs authorized for their intended use are displayed; visitor consent does not grant image usage rights.</p>
        <EmbedChoice />
      </Section>

      <Section title="Optional AI features">
        <p>When enabled by CricField, optional AI commentary sends your question and selected context through CricField's server to the configured model service (currently local Ollama; cloud providers are optional). Provider credentials remain on the server. Questions are not saved by this feature. Avoid entering private information. Commentary can be inaccurate; use computed statistics for factual checks.</p>
      </Section>

      <Section title="Optional accounts">
        <p>When accounts are enabled, Supabase processes your email address for sign-in links and stores your account profile. Your session is stored in this browser so you stay signed in. Profile access is restricted to the account owner. You can sign out from the Account page. Contact the site owner through Contact for account deletion requests.</p>
      </Section>

      <Section title="Alerts and measured usage">
        <p>Notification subscriptions store your account ID, confirmed email, chosen events and channels, and an optional WhatsApp phone number in the server’s private operations database. Queued notifications and delivery outcomes are retained for operation and troubleshooting. Email delivery uses Resend when configured; WhatsApp uses Meta only after consent, phone verification and template setup. Change preferences in Account or use the email unsubscribe link.</p>
        <p>The footer’s separate usage checkbox controls first-party measurements. When enabled, CricField records broad feature names, page views, engagement actions and a daily hashed browser-session identifier for up to 30 days. This is pseudonymous data. Daily browser-session counts are estimates, not unique people: tabs, devices and days can count separately. Only broad sections are sent, without search queries or page titles. Heartbeats measure recently active opted-in browsers. No question text or account ID is included in these usage events. Switch the checkbox off to stop new measurements. The public account count is an aggregate of confirmed Supabase accounts; usage counts exclude untracked visitors and are not bot-verified.</p>
      </Section>
      <div id="data-deletion" className="scroll-mt-20" /><Section title="Your choices">
        <Bullets items={[
          "Decline cookies in the banner, or clear this site's data in your browser to be asked again.",
          "Allow, block or reset embedded Getty photographs at any time with the buttons in the section above.",
          "Use a content blocker or your browser's privacy settings — the site does not depend on any tracker.",
          <>Questions about this policy can go to {SITE.fullName} through the <InLink href="/contact">Contact</InLink> page.</>,
        ]} />
      </Section>
    </InfoPage>
  );
}
