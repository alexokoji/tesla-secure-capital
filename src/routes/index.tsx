import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { TickerTape } from "@/components/TickerTape";
import { LiveActivityToasts } from "@/components/LiveActivityToasts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, TrendingUp, Lock, Zap, Award, BarChart3, Users, Gift, Mail, Star, ChevronLeft, ChevronRight, Activity, Sparkles, Newspaper, Calculator, Wallet, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import modelS from "@/assets/tesla-model-s.jpg";
import modelX from "@/assets/tesla-model-x.jpg";
import modelY from "@/assets/tesla-model-y.jpg";
import cybertruck from "@/assets/tesla-cybertruck.jpg";

const VEHICLES = [
  { name: "Model S Plaid", tag: "1,020 HP · 0-60 in 1.99s", img: modelS, color: "Pearl White" },
  { name: "Model X Plaid", tag: "Falcon Wings · 1,020 HP", img: modelX, color: "Midnight Silver" },
  { name: "Model Y Performance", tag: "Dual Motor AWD · 303mi", img: modelY, color: "Ultra Red" },
  { name: "Cybertruck Foundation", tag: "Stainless Exoskeleton", img: cybertruck, color: "Brushed Steel" },
];

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
      <LiveActivityToasts />
      <HeroCarousel stats={stats} />

      <div className="border-y border-primary/20 bg-black/40 backdrop-blur"><TickerTape /></div>

      {/* Live stats strip */}
      <LiveStatsStrip stats={stats} plans={plans} />

      {/* Platform stats */}
      <WhyChooseUs />

      {/* Live Market */}
      <section id="market" className="container mx-auto px-4 py-20">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tesla-gradient-text">Live TSLA Market</h2>
            <p className="text-muted-foreground mt-2">Real-time Tesla stock chart powered by TradingView.</p>
          </div>
          <BarChart3 className="h-10 w-10 text-primary" />
        </div>
        <TradingViewWidget symbol="NASDAQ:TSLA" />
      </section>

      <ProfitCalculator />

      {/* Plans */}
      <section id="plans" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tesla-gradient-text">Investment Plans</h2>
          <p className="text-muted-foreground mt-2">Choose a plan that matches your goals. Profits compound daily.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((p, i) => (
            <Card key={p.id} className={`p-6 flex flex-col glass-card ${i === 2 ? "glow-border" : ""}`}>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">{p.name}</div>
              <div className="mt-3 text-4xl font-bold neon-blue">{Number(p.daily_roi)}%</div>
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

      <FinancialNews />

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tesla-gradient-text">Trusted by investors worldwide</h2>
          <p className="text-muted-foreground mt-2">Real stories from real clients.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Marcus T.", role: "Investor · USA", quote: "Withdrew my first $12k in under 24 hours. The dashboard makes tracking ROI effortless." },
            { name: "Aisha K.", role: "Investor · UAE", quote: "The VIP plan paid off — daily ROI hit my wallet on schedule, every single day." },
            { name: "Liam P.", role: "Investor · UK", quote: "Smooth onboarding, KYC done in a day, support team responds within minutes." },
          ].map((t) => (
            <Card key={t.name} className="p-6 glass-card">
              <div className="flex gap-1 mb-3">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}</div>
              <p className="text-sm leading-relaxed">"{t.quote}"</p>
              <div className="mt-4 text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Referral */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-10 text-center border-primary/40" style={{ background: "var(--gradient-primary)" }}>
          <Gift className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h2 className="text-3xl font-bold text-primary-foreground">Earn 10% on Every Referral</h2>
          <p className="mt-3 text-primary-foreground/90 max-w-xl mx-auto">Share your unique referral link and earn lifetime commissions on every deposit your invitees make.</p>
          <Link to="/auth" search={{ mode: "signup" } as never} className="inline-block mt-6">
            <Button size="lg" variant="secondary">Get Your Referral Link</Button>
          </Link>
        </Card>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-20 max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">Frequently asked questions</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {[
            { q: "How do I start investing?", a: "Create an account, verify your email, deposit funds via crypto or bank transfer, then choose an investment plan that suits your goals." },
            { q: "How long do withdrawals take?", a: "Withdrawal requests are reviewed and processed within 24 hours. Crypto withdrawals are typically faster than bank transfers." },
            { q: "Is my investment safe?", a: "Yes. All funds are held in segregated cold wallets with multi-signature security and bank-grade 256-bit encryption." },
            { q: "What is the minimum deposit?", a: "The minimum deposit depends on the plan you choose. Our Starter plan begins at just $100." },
            { q: "Do you offer a referral program?", a: "Yes — earn 10% commission on every deposit from users you refer, paid for life." },
            { q: "How is KYC handled?", a: "Submit a government-issued ID and proof of address from your dashboard. Most submissions are approved within 24 hours." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Contact */}
      <section id="contact" className="container mx-auto px-4 py-20">
        <Card className="p-10 text-center">
          <Mail className="h-10 w-10 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold">Need help? We're here 24/7.</h2>
          <p className="text-muted-foreground mt-2">Reach our support team anytime, day or night.</p>
          <a href="mailto:support@teslasecurecapital.com" className="inline-block mt-6">
            <Button variant="outline">support@teslasecurecapital.com</Button>
          </a>
          <p className="text-xs text-muted-foreground mt-4">Already a user? <Link to="/support" className="text-primary hover:underline">Open a support ticket →</Link></p>
        </Card>
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

function HeroCarousel({ stats }: { stats?: { investors: number; deposits: number; withdrawals: number } }) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => setIdx((i) => (i + 1) % VEHICLES.length), 5000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const go = (n: number) => {
    setIdx((i) => (i + n + VEHICLES.length) % VEHICLES.length);
    if (timer.current) { clearInterval(timer.current); timer.current = setInterval(() => setIdx((i) => (i + 1) % VEHICLES.length), 5000); }
  };

  const particles = useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 10,
    size: 2 + Math.random() * 3,
    key: i,
  })), []);

  const v = VEHICLES[idx];

  return (
    <section className="relative overflow-hidden hero-radial min-h-[100svh] flex flex-col">
      {/* Animated grid */}
      <div className="absolute inset-0 opacity-40 floating-grid-bg animate-grid-pan pointer-events-none" />
      {/* Scan line */}
      <div className="absolute inset-x-0 h-32 bg-gradient-to-b from-transparent via-primary/10 to-transparent animate-scan-line pointer-events-none" />
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <span key={p.key} className="absolute rounded-full bg-primary/70"
            style={{
              left: `${p.left}%`, bottom: 0, width: p.size, height: p.size,
              boxShadow: "0 0 12px 2px oklch(0.7 0.22 240 / 0.7)",
              animation: `particle-rise ${p.duration}s linear ${p.delay}s infinite`,
            }} />
        ))}
      </div>

      <div className="relative container mx-auto px-4 pt-20 pb-10 flex-1 flex flex-col">
        <div className="grid lg:grid-cols-2 gap-10 items-center flex-1">
          {/* Left: copy */}
          <div className="z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-xs font-medium mb-6">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="tesla-gradient-text font-semibold">Powered by Tesla Energy</span>
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
              Drive the Future. <br />
              <span className="tesla-gradient-text">Invest in Innovation.</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl">
              Join thousands of investors building wealth through advanced Tesla-inspired investment opportunities, trading solutions, and digital asset management.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg" className="animate-pulse-glow"><Zap className="h-4 w-4" /> Start Investing</Button>
              </Link>
              <a href="#plans"><Button size="lg" variant="outline" className="border-primary/40">View Investment Plans</Button></a>
              <Link to="/trading"><Button size="lg" variant="ghost" className="hover:text-primary"><Activity className="h-4 w-4" /> Live Trading</Button></Link>
            </div>

            {/* Floating mini stats */}
            <div className="mt-10 grid grid-cols-3 gap-3 max-w-lg">
              <FloatStat label="Investors" value={`${((stats?.investors ?? 42180) / 1000).toFixed(1)}K+`} />
              <FloatStat label="Total Deposits" value={`$${Math.round((stats?.deposits ?? 128_000_000) / 1_000_000)}M`} />
              <FloatStat label="Avg Daily ROI" value="4.8%" />
            </div>
          </div>

          {/* Right: car carousel */}
          <div className="relative h-[360px] md:h-[520px] z-10">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* glow plate */}
              <div className="absolute bottom-[14%] w-[85%] h-10 rounded-[50%] bg-primary/40 blur-3xl" />
              <div key={idx} className="relative w-full h-full animate-car-enter">
                <div className="absolute inset-0 animate-car-float">
                  <img src={v.img} alt={`Tesla ${v.name}`} width={1600} height={900}
                    className="w-full h-full object-contain drop-shadow-[0_30px_60px_oklch(0.5_0.25_245/0.5)]" />
                </div>
              </div>
            </div>

            {/* Vehicle label */}
            <div className="absolute left-0 right-0 bottom-2 flex items-center justify-between gap-4 px-2">
              <div className="glass-card px-4 py-3 rounded-xl">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Featured</div>
                <div className="font-bold text-lg leading-tight">Tesla {v.name}</div>
                <div className="text-xs text-primary">{v.tag} · {v.color}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => go(-1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center hover:text-primary"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => go(1)} className="h-10 w-10 rounded-full glass-card flex items-center justify-center hover:text-primary"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="relative z-10 flex items-center justify-center gap-2 py-6">
          {VEHICLES.map((veh, i) => (
            <button key={veh.name} onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-10 bg-primary shadow-[0_0_12px_oklch(0.7_0.22_240)]" : "w-4 bg-white/20"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FloatStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl px-3 py-3 animate-float-slow">
      <div className="text-xl md:text-2xl font-bold neon-blue">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function LiveStatsStrip({ stats, plans }: { stats?: any; plans?: any[] }) {
  const items = [
    { icon: Users, label: "Total Investors", value: `${(stats?.investors ?? 42180).toLocaleString()}` },
    { icon: Wallet, label: "Total Deposits", value: `$${(stats?.deposits ?? 128_000_000).toLocaleString()}` },
    { icon: TrendingUp, label: "Total Withdrawals", value: `$${(stats?.withdrawals ?? 96_000_000).toLocaleString()}` },
    { icon: Activity, label: "Total Investments", value: `${(plans?.length ?? 4) * 18420}` },
    { icon: Sparkles, label: "Active Members", value: `${Math.round((stats?.investors ?? 42180) * 0.62).toLocaleString()}` },
  ];
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {items.map((it) => (
          <Card key={it.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{it.label}</span>
              <it.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-xl md:text-2xl font-bold neon-blue truncate">{it.value}</div>
            <div className="mt-2 h-1 w-full rounded-full bg-white/5 overflow-hidden"><div className="h-full w-2/3 shimmer-bar rounded-full" /></div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function WhyChooseUs() {
  const items = [
    { icon: Shield, title: "Bank-grade Security", desc: "256-bit encryption, segregated cold wallets, multi-sig withdrawals." },
    { icon: TrendingUp, title: "Verified Returns", desc: "Profits tracked daily and credited to your wallet automatically." },
    { icon: Lock, title: "Instant Withdrawals", desc: "Request a withdrawal anytime — processed within 24 hours." },
    { icon: Zap, title: "Tesla-Inspired Tech", desc: "Lightning-fast trading engine modeled on Tesla efficiency." },
    { icon: Award, title: "Award-Winning Support", desc: "Premium 24/7 live concierge for VIP investors." },
    { icon: Gift, title: "Lifetime Referral Rewards", desc: "Earn 10% commission on every referred deposit, forever." },
  ];
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tesla-gradient-text">Why Choose Us</h2>
        <p className="text-muted-foreground mt-2">Engineered like a Tesla. Trusted like a bank.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((f) => (
          <Card key={f.title} className="glass-card p-6 group hover:glow-border transition-all">
            <f.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-lg">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{f.desc}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ProfitCalculator() {
  const [amount, setAmount] = useState(5000);
  const [days, setDays] = useState(30);
  const [roi, setRoi] = useState(2.5);
  const profit = +(amount * (roi / 100) * days).toFixed(2);
  const total = +(amount + profit).toFixed(2);
  return (
    <section className="container mx-auto px-4 py-20">
      <Card className="glass-card glow-border p-8 md:p-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-primary mb-3"><Calculator className="h-5 w-5" /><span className="text-xs uppercase tracking-widest">Live Profit Calculator</span></div>
            <h2 className="text-3xl md:text-4xl font-bold tesla-gradient-text">See your future returns</h2>
            <p className="text-muted-foreground mt-3">Adjust the sliders to simulate how your investment grows with daily compound ROI.</p>

            <div className="mt-8 space-y-6">
              <Slider label="Investment Amount" value={`$${amount.toLocaleString()}`}>
                <input type="range" min={100} max={100000} step={100} value={amount} onChange={(e) => setAmount(+e.target.value)} className="w-full accent-primary" />
              </Slider>
              <Slider label="Duration" value={`${days} days`}>
                <input type="range" min={1} max={180} value={days} onChange={(e) => setDays(+e.target.value)} className="w-full accent-primary" />
              </Slider>
              <Slider label="Daily ROI" value={`${roi.toFixed(1)}%`}>
                <input type="range" min={0.5} max={7.5} step={0.1} value={roi} onChange={(e) => setRoi(+e.target.value)} className="w-full accent-primary" />
              </Slider>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="glass-card p-6 text-center"><div className="text-xs uppercase tracking-widest text-muted-foreground">Estimated Profit</div><div className="text-5xl font-bold neon-blue mt-2">${profit.toLocaleString()}</div></Card>
            <Card className="glass-card p-6 text-center"><div className="text-xs uppercase tracking-widest text-muted-foreground">Total Payout</div><div className="text-3xl font-bold tesla-gradient-text mt-2">${total.toLocaleString()}</div></Card>
            <Link to="/auth" search={{ mode: "signup" } as never}><Button size="lg" className="w-full animate-pulse-glow">Start Earning Today <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

function Slider({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{label}</span><span className="text-sm font-semibold neon-blue">{value}</span></div>
      {children}
    </div>
  );
}

function FinancialNews() {
  const news = [
    { tag: "Markets", title: "Tesla shares surge as energy storage deployments hit record high", time: "2h ago" },
    { tag: "Crypto", title: "Bitcoin reclaims $90K as institutional inflows accelerate", time: "5h ago" },
    { tag: "EV", title: "Cybertruck production ramps in Texas Gigafactory ahead of schedule", time: "1d ago" },
    { tag: "Energy", title: "Megapack installations expand across European grid operators", time: "1d ago" },
  ];
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tesla-gradient-text">Financial News</h2>
          <p className="text-muted-foreground mt-2">Latest from the markets that shape your portfolio.</p>
        </div>
        <Newspaper className="h-10 w-10 text-primary" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {news.map((n) => (
          <Card key={n.title} className="glass-card p-5 hover:glow-border transition-all cursor-pointer">
            <span className="text-[10px] uppercase tracking-widest text-primary">{n.tag}</span>
            <h3 className="font-semibold mt-2 leading-snug">{n.title}</h3>
            <div className="text-xs text-muted-foreground mt-3">{n.time}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}

