/**
 * PRIVACY — what the site does and doesn't collect. Kept in step with
 * src/lib/analytics.ts (consent-gated Google tags), the API request logger
 * (method, path, status only) and the article click counter.
 */

import { Bullets, InLink, InfoPage, Section } from "@/components/site/info-page";
import { SITE } from "@/lib/site-profile";

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy"
      intro={<>The short version: there are no accounts, no sign-up and no forms that collect personal details. Analytics and advertising cookies are used only if you accept them.</>}
      updated="8 October 2026"
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

      <Section title="Cookies, analytics and advertising">
        <p>The site can use Google Analytics 4 (to count visits) and Google AdSense (to show ads). Neither loads unless it has been configured and you choose <b className="text-white">Accept</b> in the cookie banner. If you choose <b className="text-white">Decline</b>, no Google tag loads and the site works exactly the same. If neither is configured, no banner appears because there is nothing to consent to.</p>
        <p>Your choice is stored in your own browser (local storage) so you aren't asked again. Clearing your browser's site data resets it. Data collected by Google after you accept is handled under <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2">Google's privacy policy</a>.</p>
      </Section>

      <Section title="Optional AI features">
        <p>Some tools can call Google's Gemini model to write commentary. This happens only if the site has a key configured, or if you enter your own. Your question and the data shown on screen are then sent from your browser to Google's Gemini API. A key you enter is kept only in your browser's local storage.</p>
      </Section>

      <Section title="Your choices">
        <Bullets items={[
          "Decline cookies in the banner, or clear this site's data in your browser to be asked again.",
          "Use a content blocker or your browser's privacy settings — the site does not depend on any tracker.",
          <>Questions about this policy can go to {SITE.fullName} through the <InLink href="/contact">Contact</InLink> page.</>,
        ]} />
      </Section>
    </InfoPage>
  );
}
