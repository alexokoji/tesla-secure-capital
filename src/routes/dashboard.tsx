import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { toast } from "sonner";
import {
  Wallet, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown,
  Bell, Headphones, Link2, ShieldCheck, Crown, Activity, Zap, Trophy,
  Sparkles, Copy, Calculator, Newspaper, Bot, Languages, Repeat, ArrowLeftRight,
  QrCode, Gift, Star, Menu, LayoutDashboard, Users, LifeBuoy, FileCheck2, Upload,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Tesla Secure Capital" }] }),
  component: Dashboard,
});

const TESLA_BLUE = "oklch(0.72 0.2 240)";
const TESLA_CYAN = "oklch(0.78 0.14 210)";

function useAnimatedNumber(value: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return v;
}

function fmtUSD(n: number, digits = 2) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function Particles() {
  const dots = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({
      left: Math.random() * 100, top: Math.random() * 100,
      size: 2 + Math.random() * 4, delay: Math.random() * 5,
      dur: 5 + Math.random() * 6, key: i,
    })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <span key={d.key}
          className="absolute rounded-full bg-[oklch(0.78_0.18_240)]/40 blur-[1px] animate-float-slow"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size,
            animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />
      ))}
    </div>
  );
}

function Dashboard() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: txs, refetch: refetchTx } = useQuery({
    queryKey: ["tx", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["plans-active"],
    queryFn: async () => {
      const { data } = await supabase.from("investment_plans").select("*").eq("is_active", true).order("min_amount");
      return data ?? [];
    },
  });

  const { data: investments } = useQuery({
    queryKey: ["investments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("investments").select("*, plan:investment_plans(*)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user || !profile) {
    return (
      <div className="container mx-auto p-10 text-center text-muted-foreground">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-[oklch(0.72_0.2_240)] border-t-transparent animate-spin" />
        <p className="mt-4">Loading your portfolio…</p>
      </div>
    );
  }

  const balance = Number(profile.balance) || 0;
  const totalDeposit = Number(profile.total_deposit) || 0;
  const totalProfit = Number(profile.total_profit) || 0;
  const activeInvested = (investments ?? [])
    .filter((i: any) => i.status === "active" || i.status === "approved")
    .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const referralEarnings = totalProfit * 0.08;
  const tradingPortfolio = balance * 0.62 + activeInvested * 0.35;

  const tier =
    totalDeposit >= 50000 ? { name: "VIP", color: "from-fuchsia-500 to-violet-600", icon: Crown }
    : totalDeposit >= 20000 ? { name: "Platinum", color: "from-slate-300 to-slate-500", icon: Trophy }
    : totalDeposit >= 5000 ? { name: "Gold", color: "from-amber-400 to-yellow-600", icon: Star }
    : { name: "Silver", color: "from-slate-400 to-slate-600", icon: ShieldCheck };

  return (
    <div className="relative min-h-screen floating-grid-bg">
      <Particles />
      <div className="relative container mx-auto px-4 py-8 space-y-6">
        <DashHeader profile={profile} tier={tier} />

        <StatsGrid balance={balance} activeInvested={activeInvested} totalProfit={totalProfit}
          referralEarnings={referralEarnings} tradingPortfolio={tradingPortfolio} />

        <QuickActions plans={plans ?? []} balance={balance}
          onDone={() => { refetchTx(); refreshProfile(); }} />

        <div className="grid lg:grid-cols-3 gap-6">
          <PortfolioChart className="lg:col-span-2" />
          <AllocationChart balance={balance} invested={activeInvested} profit={totalProfit} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <TradingPanel className="lg:col-span-2" />
          <MarketOverview />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <ActiveInvestments investments={investments ?? []} onDone={() => { refetchTx(); refreshProfile(); }} />
          <LiveActivity txs={txs ?? []} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <TopMovers />
          <CompoundCalculator />
          <ConverterWidget />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <ReferralPanel profile={profile} />
          <AchievementsPanel totalDeposit={totalDeposit} totalProfit={totalProfit} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <AIAssistant className="lg:col-span-2" />
          <NewsWidget />
        </div>

        <TransactionsTable txs={txs ?? []} />
      </div>
    </div>
  );
}

function DashHeader({ profile, tier }: { profile: any; tier: any }) {
  const TierIcon = tier.icon;
  const initials = (profile.full_name || profile.email || "U").slice(0, 2).toUpperCase();
  const verified = profile.kyc_status === "approved";
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-14 w-14 ring-2 ring-[oklch(0.72_0.2_240)]/60">
              <AvatarFallback className="bg-gradient-to-br from-[oklch(0.3_0.15_250)] to-[oklch(0.18_0.05_260)] text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {verified && (
              <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-[oklch(0.72_0.2_240)] ring-2 ring-background">
                <ShieldCheck className="h-3 w-3 text-white" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg sm:text-2xl font-bold tesla-gradient-text">
                {profile.full_name || profile.email}
              </h1>
              <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${tier.color} px-2.5 py-0.5 text-xs font-semibold text-white shadow-lg`}>
                <TierIcon className="h-3 w-3" /> {tier.name}
              </span>
              {verified ? (
                <Badge variant="outline" className="border-[oklch(0.72_0.2_240)]/40 text-[oklch(0.85_0.1_240)]">Verified</Badge>
              ) : (
                <Link to="/kyc"><Badge variant="outline">Verify KYC</Badge></Link>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Tesla Secure Capital · Welcome back</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[oklch(0.72_0.2_240)] animate-pulse" />
            </Button>
          </Link>
          <Link to="/support">
            <Button variant="ghost" size="icon"><Headphones className="h-5 w-5" /></Button>
          </Link>
          <Button className="hidden sm:inline-flex bg-gradient-to-r from-[oklch(0.55_0.22_245)] to-[oklch(0.4_0.18_260)] hover:opacity-90 animate-pulse-glow">
            <Link2 className="h-4 w-4 mr-2" /> Connect Wallet
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatsGrid(props: {
  balance: number; activeInvested: number; totalProfit: number;
  referralEarnings: number; tradingPortfolio: number;
}) {
  const items = [
    { label: "Total Balance", value: props.balance, icon: Wallet, accent: true, delta: "+2.4%" },
    { label: "Active Investment", value: props.activeInvested, icon: Activity, delta: "+5.1%" },
    { label: "Total Profit Earned", value: props.totalProfit, icon: TrendingUp, delta: "+12.8%" },
    { label: "Referral Earnings", value: props.referralEarnings, icon: Gift, delta: "+1.2%" },
    { label: "Available Withdrawal", value: props.balance, icon: ArrowUpFromLine, delta: "Ready" },
    { label: "Trading Portfolio", value: props.tradingPortfolio, icon: Zap, delta: "+3.6%" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {items.map((it) => <StatCard key={it.label} {...it} />)}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent, delta }: any) {
  const animated = useAnimatedNumber(value);
  return (
    <div className={`glass-card rounded-2xl p-4 relative overflow-hidden transition-all hover:-translate-y-1 hover:glow-border ${accent ? "glow-border" : ""}`}>
      <div className="absolute inset-x-0 top-0 h-px shimmer-bar" />
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "neon-blue" : "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 text-xl sm:text-2xl font-bold tabular-nums ${accent ? "neon-blue" : "text-foreground"}`}>
        {fmtUSD(animated)}
      </div>
      <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" /> {delta}
      </div>
    </div>
  );
}

function QuickActions({ plans, balance, onDone }: any) {
  return (
    <div className="flex flex-wrap gap-2">
      <TxDialog type="deposit" onDone={onDone} />
      <TxDialog type="withdrawal" onDone={onDone} maxAmount={balance} />
      <InvestDialog plans={plans} balance={balance} onDone={onDone} />
      <Button variant="outline"><ArrowLeftRight className="h-4 w-4 mr-2" />Transfer</Button>
      <Button variant="outline"><QrCode className="h-4 w-4 mr-2" />QR Deposit</Button>
      <Link to="/profile"><Button variant="ghost">Profile</Button></Link>
      <Link to="/kyc"><Button variant="ghost">KYC</Button></Link>
      <Link to="/referrals"><Button variant="ghost">Referrals</Button></Link>
    </div>
  );
}

function PortfolioChart({ className = "" }: { className?: string }) {
  const data = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    d: i + 1,
    value: 8000 + Math.sin(i / 3) * 800 + i * 180 + Math.random() * 400,
    profit: 200 + Math.cos(i / 4) * 120 + i * 22,
  })), []);
  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Portfolio Growth</h3>
          <p className="text-xs text-muted-foreground">Last 30 days · Tesla Secure Capital</p>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">+18.4% MoM</Badge>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TESLA_BLUE} stopOpacity={0.6} />
                <stop offset="100%" stopColor={TESLA_BLUE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TESLA_CYAN} stopOpacity={0.5} />
                <stop offset="100%" stopColor={TESLA_CYAN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.65 0.2 240 / 0.3)", borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" stroke={TESLA_BLUE} strokeWidth={2} fill="url(#g1)" />
            <Area type="monotone" dataKey="profit" stroke={TESLA_CYAN} strokeWidth={2} fill="url(#g2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AllocationChart({ balance, invested, profit }: any) {
  const data = [
    { name: "Cash", value: Math.max(1, balance) },
    { name: "Invested", value: Math.max(1, invested) },
    { name: "Profit", value: Math.max(1, profit) },
    { name: "Trading", value: Math.max(1, balance * 0.4) },
  ];
  const colors = ["oklch(0.7 0.2 240)", "oklch(0.65 0.18 220)", "oklch(0.78 0.17 160)", "oklch(0.7 0.22 290)"];
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold mb-1">Asset Allocation</h3>
      <p className="text-xs text-muted-foreground mb-3">Real-time portfolio split</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={55} outerRadius={85} stroke="none" paddingAngle={3}>
              {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.65 0.2 240 / 0.3)", borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: colors[i] }} />
            <span className="text-muted-foreground">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradingPanel({ className = "" }: { className?: string }) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4 neon-blue" /> Live Trading · TSLA/USD</h3>
          <p className="text-xs text-muted-foreground">Powered by TradingView · Real-time</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold neon-blue">$248.92</div>
          <div className="text-xs text-emerald-400">+2.84%</div>
        </div>
      </div>
      <div className="h-56 rounded-xl overflow-hidden border border-[oklch(0.65_0.2_240)]/20 bg-[oklch(0.12_0.02_260)]">
        <iframe title="TradingView" loading="lazy" className="w-full h-full"
          src="https://s.tradingview.com/widgetembed/?symbol=NASDAQ:TSLA&interval=60&theme=dark&style=1&hidesidetoolbar=1&hidetoptoolbar=1&withdateranges=0" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Button variant={tab === "buy" ? "default" : "outline"} onClick={() => setTab("buy")}
          className={tab === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
          <TrendingUp className="h-4 w-4 mr-2" /> Buy
        </Button>
        <Button variant={tab === "sell" ? "default" : "outline"} onClick={() => setTab("sell")}
          className={tab === "sell" ? "bg-rose-500 hover:bg-rose-600" : ""}>
          <TrendingDown className="h-4 w-4 mr-2" /> Sell
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Input placeholder="Amount in USD" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
        <Button onClick={() => toast.success(`${tab === "buy" ? "Buy" : "Sell"} order placed`)}>Place Order</Button>
      </div>
    </div>
  );
}

const MARKETS = [
  { sym: "BTC", name: "Bitcoin", price: 71284.5, change: 2.4, type: "Crypto" },
  { sym: "ETH", name: "Ethereum", price: 3782.1, change: 3.1, type: "Crypto" },
  { sym: "TSLA", name: "Tesla Inc.", price: 248.92, change: 2.84, type: "Stock" },
  { sym: "AAPL", name: "Apple", price: 218.47, change: 0.62, type: "Stock" },
  { sym: "EUR/USD", name: "Euro/Dollar", price: 1.0892, change: -0.21, type: "Forex" },
  { sym: "GBP/USD", name: "Pound/Dollar", price: 1.2671, change: 0.18, type: "Forex" },
  { sym: "SOL", name: "Solana", price: 187.4, change: -1.8, type: "Crypto" },
  { sym: "XAU/USD", name: "Gold", price: 2378.5, change: 0.42, type: "Forex" },
];

function MarketOverview() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold mb-3">Market Overview</h3>
      <div className="space-y-1 max-h-[360px] overflow-auto pr-1">
        {MARKETS.map((m) => (
          <div key={m.sym} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-white/5">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{m.sym}</div>
              <div className="text-[10px] text-muted-foreground truncate">{m.name} · {m.type}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium tabular-nums">${m.price.toLocaleString()}</div>
              <div className={`text-[10px] ${m.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {m.change >= 0 ? "+" : ""}{m.change}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopMovers() {
  const gainers = MARKETS.filter((m) => m.change > 0).sort((a, b) => b.change - a.change).slice(0, 4);
  const losers = MARKETS.filter((m) => m.change < 0).sort((a, b) => a.change - b.change).slice(0, 4);
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold mb-3">Top Gainers & Losers</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-emerald-400 mb-2">Gainers</p>
          {gainers.map((m) => (
            <div key={m.sym} className="flex items-center justify-between py-1.5 text-sm">
              <span className="font-medium">{m.sym}</span>
              <span className="text-emerald-400 text-xs">+{m.change}%</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs text-rose-400 mb-2">Losers</p>
          {losers.length === 0 && <p className="text-xs text-muted-foreground">All green today</p>}
          {losers.map((m) => (
            <div key={m.sym} className="flex items-center justify-between py-1.5 text-sm">
              <span className="font-medium">{m.sym}</span>
              <span className="text-rose-400 text-xs">{m.change}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 p-3 rounded-lg border border-[oklch(0.65_0.2_240)]/20 bg-[oklch(0.65_0.2_240)]/5">
        <p className="text-xs text-muted-foreground">Market Sentiment</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500" style={{ width: "72%" }} />
          </div>
          <span className="text-xs font-semibold text-emerald-400">Greed 72</span>
        </div>
      </div>
    </div>
  );
}

function ActiveInvestments({ investments, onDone }: any) {
  const active = investments.filter((i: any) => i.status === "active" || i.status === "approved");
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Active Investments</h3>
        <Badge variant="outline" className="border-[oklch(0.72_0.2_240)]/40">{active.length} Active</Badge>
      </div>
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active investments yet. Choose a plan to start earning.</p>
      ) : (
        <div className="space-y-3">
          {active.slice(0, 4).map((inv: any) => {
            const start = new Date(inv.created_at).getTime();
            const end = new Date(inv.ends_at).getTime();
            const now = Date.now();
            const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
            const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
            return (
              <div key={inv.id} className="p-3 rounded-xl border border-white/5 bg-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{inv.plan?.name ?? "Tesla Plan"}</div>
                    <div className="text-[10px] text-muted-foreground">Matures {new Date(end).toLocaleDateString()} · {daysLeft}d left</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold neon-blue">{fmtUSD(Number(inv.amount))}</div>
                    <div className="text-[10px] text-emerald-400">{inv.plan?.daily_roi ?? 1.5}% daily</div>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5 mt-2" />
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="outline" onClick={() => { toast.success("Reinvestment queued"); onDone(); }}>
                    <Repeat className="h-3 w-3 mr-1" /> Reinvest
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiveActivity({ txs }: { txs: any[] }) {
  const fakeFeed = useMemo(() => [
    { user: "Marcus K.", action: "deposited", amount: 5400, type: "deposit" },
    { user: "Aisha R.", action: "earned profit on", amount: 312, type: "profit" },
    { user: "Diego M.", action: "invested in Platinum", amount: 12000, type: "investment" },
    { user: "Lin C.", action: "withdrew", amount: 2200, type: "withdrawal" },
    { user: "Sven P.", action: "earned profit on", amount: 88, type: "profit" },
    { user: "Yara N.", action: "deposited", amount: 760, type: "deposit" },
  ], []);
  const color: Record<string, string> = {
    deposit: "text-emerald-400", withdrawal: "text-amber-400",
    investment: "text-[oklch(0.78_0.18_240)]", profit: "text-fuchsia-400",
  };
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
            <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live Activity
        </h3>
        <Badge variant="outline">Real-time</Badge>
      </div>
      <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
        {fakeFeed.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5">
            <span><span className="font-medium">{f.user}</span> <span className="text-muted-foreground">{f.action}</span></span>
            <span className={`tabular-nums font-semibold ${color[f.type]}`}>{fmtUSD(f.amount, 0)}</span>
          </div>
        ))}
        {txs.slice(0, 3).map((t) => (
          <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5">
            <span><span className="font-medium">You</span> <span className="text-muted-foreground capitalize">{t.type}</span></span>
            <span className="tabular-nums font-semibold">{fmtUSD(Number(t.amount), 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompoundCalculator() {
  const [principal, setPrincipal] = useState("1000");
  const [rate, setRate] = useState("1.5");
  const [days, setDays] = useState("30");
  const result = useMemo(() => {
    const p = Number(principal) || 0;
    const r = (Number(rate) || 0) / 100;
    const d = Number(days) || 0;
    return p * Math.pow(1 + r, d);
  }, [principal, rate, days]);
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-3"><Calculator className="h-4 w-4 neon-blue" /> Compound Calculator</h3>
      <div className="space-y-2">
        <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="Principal" />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Daily ROI %" />
          <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="Days" />
        </div>
      </div>
      <div className="mt-4 p-3 rounded-xl glow-border">
        <p className="text-xs text-muted-foreground">Estimated value</p>
        <p className="text-2xl font-bold neon-blue tabular-nums">{fmtUSD(result)}</p>
      </div>
    </div>
  );
}

function ConverterWidget() {
  const [amt, setAmt] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("BTC");
  const rates: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, BTC: 1 / 71284.5, ETH: 1 / 3782.1 };
  const out = (Number(amt) || 0) * (rates[to] / rates[from]);
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-3"><Languages className="h-4 w-4 neon-blue" /> Currency Converter</h3>
      <Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Select value={from} onValueChange={setFrom}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.keys(rates).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={to} onValueChange={setTo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.keys(rates).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="mt-4 p-3 rounded-xl glow-border">
        <p className="text-xs text-muted-foreground">{amt} {from} =</p>
        <p className="text-2xl font-bold neon-blue tabular-nums">{out.toFixed(6)} {to}</p>
      </div>
    </div>
  );
}

function ReferralPanel({ profile }: any) {
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${profile.referral_code || ""}`;
  const leaders = [
    { name: "Alex T.", earned: 12480 },
    { name: "Priya S.", earned: 8920 },
    { name: "Marco V.", earned: 6310 },
    { name: "You", earned: 1240 },
  ];
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold mb-3">Referral Program</h3>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input readOnly value={link} className="text-xs" />
        <Button onClick={() => { navigator.clipboard.writeText(link); toast.success("Referral link copied"); }}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="p-3 rounded-xl bg-white/5"><p className="text-[10px] text-muted-foreground">Referrals</p><p className="text-lg font-bold">12</p></div>
        <div className="p-3 rounded-xl bg-white/5"><p className="text-[10px] text-muted-foreground">Commission</p><p className="text-lg font-bold neon-blue">$1,240</p></div>
        <div className="p-3 rounded-xl bg-white/5"><p className="text-[10px] text-muted-foreground">Rate</p><p className="text-lg font-bold">10%</p></div>
      </div>
      <div className="mt-4">
        <p className="text-xs text-muted-foreground mb-2">Leaderboard</p>
        <div className="space-y-1.5">
          {leaders.map((l, i) => (
            <div key={l.name} className={`flex items-center justify-between text-sm p-2 rounded-lg ${l.name === "You" ? "bg-[oklch(0.65_0.2_240)]/15 border border-[oklch(0.65_0.2_240)]/30" : "bg-white/5"}`}>
              <span className="flex items-center gap-2"><span className="text-xs text-muted-foreground">#{i + 1}</span>{l.name}</span>
              <span className="font-semibold tabular-nums">{fmtUSD(l.earned, 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AchievementsPanel({ totalDeposit, totalProfit }: any) {
  const milestones = [
    { label: "First Deposit", done: totalDeposit > 0, icon: Sparkles },
    { label: "$1K Invested", done: totalDeposit >= 1000, icon: Trophy },
    { label: "$10K Club", done: totalDeposit >= 10000, icon: Crown },
    { label: "Profit Maker", done: totalProfit > 100, icon: TrendingUp },
    { label: "Daily Streak 7", done: false, icon: Activity },
    { label: "VIP Status", done: totalDeposit >= 50000, icon: Star },
  ];
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Achievements & Daily Rewards</h3>
        <Button size="sm" variant="outline" onClick={() => toast.success("+25 reward points claimed")}>
          <Gift className="h-3 w-3 mr-1" /> Claim Daily
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {milestones.map((m) => {
          const I = m.icon;
          return (
            <div key={m.label} className={`p-3 rounded-xl text-center transition-all ${m.done ? "bg-gradient-to-br from-[oklch(0.55_0.22_245)]/30 to-[oklch(0.3_0.15_260)]/20 glow-border" : "bg-white/5 opacity-60"}`}>
              <I className={`h-5 w-5 mx-auto mb-1 ${m.done ? "neon-blue" : "text-muted-foreground"}`} />
              <p className="text-[10px] font-medium">{m.label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Next milestone</span>
          <span className="text-muted-foreground">{fmtUSD(totalDeposit, 0)} / $50,000</span>
        </div>
        <Progress value={Math.min(100, (totalDeposit / 50000) * 100)} className="h-2" />
      </div>
    </div>
  );
}

function AIAssistant({ className = "" }: { className?: string }) {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([
    { role: "ai", text: "Hi — I'm your Tesla AI Investment Assistant. Ask me about your portfolio or markets." },
  ]);
  const send = () => {
    if (!q.trim()) return;
    const userQ = q;
    setMsgs((m) => [...m, { role: "you", text: userQ }]);
    setQ("");
    setTimeout(() => {
      setMsgs((m) => [...m, {
        role: "ai",
        text: `Based on current market conditions, consider diversifying ~${Math.floor(Math.random() * 20 + 20)}% into the Platinum plan for stable compound returns.`,
      }]);
    }, 600);
  };
  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      <h3 className="font-semibold flex items-center gap-2 mb-3"><Bot className="h-4 w-4 neon-blue" /> AI Investment Assistant</h3>
      <div className="h-44 overflow-auto space-y-2 mb-3 pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`text-sm p-2.5 rounded-lg ${m.role === "ai" ? "bg-white/5" : "bg-[oklch(0.55_0.22_245)]/20 ml-8"}`}>
            <span className="text-[10px] uppercase text-muted-foreground">{m.role}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything…"
          onKeyDown={(e) => e.key === "Enter" && send()} />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
}

function NewsWidget() {
  const news = [
    { t: "Fed signals rate cut as inflation cools", src: "Reuters", time: "2h" },
    { t: "Tesla deliveries hit new quarterly record", src: "Bloomberg", time: "4h" },
    { t: "Bitcoin ETF inflows top $2B this week", src: "CoinDesk", time: "6h" },
    { t: "Gold rallies on safe-haven demand", src: "FT", time: "8h" },
  ];
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-3"><Newspaper className="h-4 w-4 neon-blue" /> Economic News</h3>
      <div className="space-y-3">
        {news.map((n, i) => (
          <div key={i} className="text-sm border-b border-white/5 pb-2 last:border-0">
            <p className="font-medium">{n.t}</p>
            <p className="text-[10px] text-muted-foreground">{n.src} · {n.time} ago</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsTable({ txs }: { txs: any[] }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold mb-4">Transaction History</h3>
      {!txs.length ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : (
        <div className="space-y-2">
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-white/5 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium capitalize">{t.type}</div>
                <div className="text-xs text-muted-foreground truncate">{new Date(t.created_at).toLocaleString()} {t.method ? `· ${t.method}` : ""}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">{fmtUSD(Number(t.amount))}</div>
                <Badge variant={t.status === "approved" || t.status === "completed" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>{t.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TxDialog({ type, onDone, maxAmount }: { type: "deposit" | "withdrawal"; onDone: () => void; maxAmount?: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bitcoin");
  const { user } = useAuth();

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (type === "withdrawal" && maxAmount !== undefined && amt > maxAmount) return toast.error("Insufficient balance");
    const { error } = await supabase.from("transactions").insert({
      user_id: user!.id, type, amount: amt, method, status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success(`${type === "deposit" ? "Deposit" : "Withdrawal"} request submitted. Awaiting admin approval.`);
    setOpen(false); setAmount(""); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={type === "deposit" ? "default" : "outline"}
          className={type === "deposit" ? "bg-gradient-to-r from-[oklch(0.55_0.22_245)] to-[oklch(0.4_0.18_260)] hover:opacity-90" : ""}>
          {type === "deposit" ? <ArrowDownToLine className="h-4 w-4 mr-2" /> : <ArrowUpFromLine className="h-4 w-4 mr-2" />}
          {type === "deposit" ? "Deposit" : "Withdraw"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="capitalize">{type} Request</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Amount (USD)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                <SelectItem value="Ethereum">Ethereum</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="Gift Card">Gift Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} className="w-full">Submit Request</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvestDialog({ plans, balance, onDone }: { plans: any[]; balance: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const { user } = useAuth();

  const plan = plans.find((p) => p.id === planId);

  const submit = async () => {
    const amt = Number(amount);
    if (!plan) return;
    if (amt < Number(plan.min_amount) || amt > Number(plan.max_amount)) return toast.error(`Amount must be between $${plan.min_amount} and $${plan.max_amount}`);
    if (amt > balance) return toast.error("Insufficient balance — deposit first");
    const { error } = await supabase.from("investments").insert({
      user_id: user!.id, plan_id: planId, amount: amt,
      ends_at: new Date(Date.now() + plan.duration_days * 86400000).toISOString(),
    });
    if (error) return toast.error(error.message);
    await supabase.from("transactions").insert({
      user_id: user!.id, type: "investment", amount: amt, status: "pending", notes: `Invest in ${plan.name}`,
    });
    toast.success("Investment submitted for approval.");
    setOpen(false); setAmount(""); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary"><TrendingUp className="h-4 w-4 mr-2" />Invest</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Investment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.daily_roi}% daily / {p.duration_days}d</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Amount (USD)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          {plan && <p className="text-xs text-muted-foreground">Range: ${Number(plan.min_amount).toLocaleString()} – ${Number(plan.max_amount).toLocaleString()}</p>}
          <Button onClick={submit} className="w-full">Confirm Investment</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}