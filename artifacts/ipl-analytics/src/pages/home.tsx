import { Layout } from "@/components/layout";

export default function Home() {
  return (
    <Layout>
      <div className="space-y-8">
        <div className="relative py-24 rounded-2xl overflow-hidden bg-card border border-border">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
          <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-foreground">
              IPL is not just cricket. <br />
              <span className="text-primary">It's a Product. A Business.</span> <br />
              <span className="text-accent">A Billion Dollar Ecosystem.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Dive into 18 seasons of data. Explore player impact, business valuations, and advanced analytics in the most comprehensive IPL dashboard.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
