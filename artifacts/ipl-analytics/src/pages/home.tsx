import { Layout } from "@/components/layout";
import HomeContent from "@/mobile/screens/home";
import "./home-shared-desktop.css";

/** Share the current Home content with mobile so stories, tools and links stay aligned. */
export default function HomePage() {
  return (
    <Layout hideRightPanel>
      <div className="desktop-home" data-testid="desktop-home-page">
        <HomeContent />
      </div>
    </Layout>
  );
}
