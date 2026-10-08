/**
 * DISCLAIMER — independence, trademarks, accuracy, and what the models are not.
 */

import { Bullets, InLink, InfoPage, Section } from "@/components/site/info-page";
import { SITE } from "@/lib/site-profile";

export default function DisclaimerPage() {
  return (
    <InfoPage
      eyebrow="Disclaimer"
      title="Disclaimer"
      intro={<>{SITE.projectName} is an independent portfolio project built by {SITE.fullName} to demonstrate data analysis and engineering.</>}
      updated="8 October 2026"
    >
      <Section title="Not affiliated">
        <p>This site is not affiliated with, endorsed by or sponsored by the Indian Premier League, the Board of Control for Cricket in India (BCCI), any IPL franchise or player, or any of the data providers listed on the <InLink href="/data-sources">Data Sources</InLink> page.</p>
      </Section>

      <Section title="Trademarks and images">
        <p>"Indian Premier League", "IPL", franchise names and logos are trademarks of their respective owners. Player photographs, logos and venue images belong to their owners and appear only to identify players, teams and grounds. If you own an image or mark and would like it removed, please get in touch through the <InLink href="/contact">Contact</InLink> page and it will be taken down.</p>
      </Section>

      <Section title="Accuracy of the data">
        <p>Statistics are built from public ball-by-ball records and other public sources, which can contain errors or gaps. The data is checked and reconciled (see <InLink href="/data-sources#health">data health checks</InLink>), but no guarantee is made that every figure is complete or correct. Live scores and news come from third parties and may be delayed or change.</p>
      </Section>

      <Section title="Models are estimates, not advice">
        <Bullets items={[
          "Win probabilities, simulations, ratings, similarity scores and auction valuations are statistical estimates from past IPL matches. They describe likelihoods, not certainties, and they show their own error ranges.",
          "Nothing on this site is betting, wagering, fantasy-sports, financial or investment advice, and it should not be used for any of those purposes.",
          "Auction signals and bid ceilings are illustrations of a valuation method. They are not offers and do not reflect the views of any franchise.",
          "Where a feature uses an AI language model to write text, that text can be wrong and should be read as commentary rather than fact.",
        ]} />
        <p>How each figure is calculated is set out on the <InLink href="/methodology">Methodology</InLink> page.</p>
      </Section>

      <Section title="Third-party content and links">
        <p>Ball-by-ball commentary and news headlines belong to their publishers and are shown with attribution. Links to other sites are provided for convenience; those sites are not under this site's control and linking to them is not an endorsement. Advertisements, if shown, are served by Google and are not endorsements either.</p>
      </Section>

      <Section title="Demonstration features">
        <p>Some pages — such as the shop, the auction game and the analyst-mode badge — are interface demonstrations. No products are sold, and no orders, payments or accounts are taken.</p>
      </Section>
    </InfoPage>
  );
}
