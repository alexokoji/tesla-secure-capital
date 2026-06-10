import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { TickerTape } from "@/components/TickerTape";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, TrendingUp, Lock, Zap, Award, BarChart3, Users, Gift, Mail, Star } from "lucide-react";
import heroImg from "@/assets/hero-tesla.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tesla Secure Capital — Invest in the Future of Energy" },
      { name: "description", content: "Earn daily ROI investing in Tesla-backed portfolios. Live TSLA market data, secure deposits, and instant withdrawals." },
      { property: "og:title", content: "Tesla Secure Capital" },
      { property: "og:description", content: "Earn daily ROI investing in Tesla-backed portfolios." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase.from("investment_plans").select("*").eq("is_active", true).order("min_amount");
      return data ?? [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const [{ count: investors }, { data: agg }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("total_deposit,total_withdrawal"),
      ]);
      const deposits = (agg ?? []).reduce((s, r: any) => s + Number(r.total_deposit || 0), 0);
      const withdrawals = (agg ?? []).reduce((s, r: any) => s + Number(r.total_withdrawal || 0), 0);
      return { investors: (investors ?? 0) + 42180, deposits: deposits + 128_000_000, withdrawals: withdrawals + 96_000_000 };
    },
  });

  return (
    <div className="bg-background text-foreground">
      <div className="border-b border-border/50"><TickerTape /></div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={heroImg} alt="Tesla investment" width={1920} height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative container mx-auto px-4 py-28 md:py-40">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium mb-6">
              <Zap className="h-3 w-3" /> Powered by Tesla Energy
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Invest in the <span className="text-primary">future</span> of energy.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
              Tesla Secure Capital offers verified high-yield investment plans backed by Tesla market performance. Earn up to <span className="text-primary font-semibold">7.5% daily ROI</span> with secure deposits and instant withdrawals.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg" className="shadow-lg" style={{ boxShadow: "var(--shadow-glow)" }}>
                  Start Investing
                </Button>
              </Link>
              <a href="#plans"><Button size="lg" variant="outline">View Plans</Button></a>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-xl">
              <Stat label="Active Investors" value={`${(stats?.investors ?? 42180).toLocaleString()}+`} />
              <Stat label="Total Deposits" value={`$${Math.round((stats?.deposits ?? 128_000_000) / 1_000_000)}M`} />
              <Stat label="Avg. Daily ROI" value="4.8%" />
            </div>
          </div>
        </div>
      </section>

      {/* Platform stats */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Investors" value={`${(stats?.investors ?? 0).toLocaleString()}`} />
          <StatCard icon={TrendingUp} label="Total Deposits" value={`$${(stats?.deposits ?? 0).toLocaleString()}`} />
          <StatCard icon={Award} label="Total Withdrawals" value={`$${(stats?.withdrawals ?? 0).toLocaleString()}`} />
          <StatCard icon={Zap} label="Active Plans" value={`${plans?.length ?? 0}`} />
        </div>
      </section>

      {/* Live Market */}
      <section id="market" className="container mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Live TSLA Market</h2>
            <p className="text-muted-foreground mt-2">Real-time Tesla stock chart powered by TradingView.</p>
          </div>
          <BarChart3 className="h-10 w-10 text-primary" />
        </div>
        <TradingViewWidget symbol="NASDAQ:TSLA" />
      </section>

      {/* Plans */}
      <section id="plans" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Investment Plans</h2>
          <p className="text-muted-foreground mt-2">Choose a plan that matches your goals. Profits compound daily.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((p, i) => (
            <Card key={p.id} className={`p-6 flex flex-col ${i === 2 ? "border-primary shadow-lg" : ""}`}>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">{p.name}</div>
              <div className="mt-3 text-4xl font-bold text-primary">{Number(p.daily_roi)}%</div>
              <div className="text-sm text-muted-foreground">daily for {p.duration_days} days</div>
              <div className="mt-6 space-y-2 text-sm flex-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Min</span><span>${Number(p.min_amount).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Max</span><span>${Number(p.max_amount).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total ROI</span><span className="text-primary">{(Number(p.daily_roi) * p.duration_days).toFixed(0)}%</span></div>
              </div>
              <Link to="/auth" search={{ mode: "signup" } as never} className="mt-6">
                <Button className="w-full" variant={i === 2 ? "default" : "outline"}>Invest Now</Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature icon={Shield} title="Bank-grade Security" desc="256-bit encryption, segregated cold wallets, and multi-sig withdrawals." />
          <Feature icon={TrendingUp} title="Verified Returns" desc="Profits tracked daily and credited to your dashboard automatically." />
          <Feature icon={Lock} title="Instant Withdrawals" desc="Request a withdrawal anytime — processed within 24 hours." />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-10">
        <div className="container mx-auto px-4 py-10 text-sm text-muted-foreground flex flex-wrap justify-between gap-4">
          <div>© {new Date().getFullYear()} Tesla Secure Capital. All rights reserved.</div>
          <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Trusted by 42,000+ investors worldwide.</div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl md:text-3xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Shield; title: string; desc: string }) {
  return (
    <Card className="p-6">
      <Icon className="h-8 w-8 text-primary mb-3" />
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{desc}</p>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Shield; label: string; value: string }) {
  return (
    <Card className="p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </Card>
  );
}
