import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";

export const Route = createFileRoute("/trading")({
  head: () => ({ meta: [
    { title: "Live Trading — Tesla Secure Capital" },
    { name: "description", content: "Trade Tesla stock, forex, and crypto with real-time TradingView charts and your personal watchlist." },
  ] }),
  component: TradingPage,
});

const PRESETS = {
  stocks: [
    { sym: "NASDAQ:TSLA", label: "Tesla" },
    { sym: "NASDAQ:AAPL", label: "Apple" },
    { sym: "NASDAQ:NVDA", label: "Nvidia" },
    { sym: "NASDAQ:MSFT", label: "Microsoft" },
  ],
  crypto: [
    { sym: "BITSTAMP:BTCUSD", label: "BTC/USD" },
    { sym: "BITSTAMP:ETHUSD", label: "ETH/USD" },
    { sym: "BINANCE:SOLUSDT", label: "SOL/USDT" },
    { sym: "BINANCE:BNBUSDT", label: "BNB/USDT" },
  ],
  forex: [
    { sym: "FX_IDC:EURUSD", label: "EUR/USD" },
    { sym: "FX_IDC:GBPUSD", label: "GBP/USD" },
    { sym: "FX_IDC:USDJPY", label: "USD/JPY" },
    { sym: "FX_IDC:AUDUSD", label: "AUD/USD" },
  ],
};

const NEWS = [
  { title: "Tesla unveils next-gen battery tech for 2026 lineup", source: "Reuters" },
  { title: "Bitcoin breaks $80k as ETF inflows hit record high", source: "Bloomberg" },
  { title: "Fed signals rate hold; markets rally on stable outlook", source: "WSJ" },
  { title: "Nvidia earnings beat estimates, AI demand still surging", source: "CNBC" },
];

function TradingPage() {
  const [symbol, setSymbol] = useState("NASDAQ:TSLA");
  const [custom, setCustom] = useState("");
  const { user } = useAuth();

  const { data: watch, refetch } = useQuery({
    queryKey: ["watchlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("watchlist").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addWatch = async (sym: string) => {
    if (!user) return toast.error("Sign in to use watchlist");
    const { error } = await supabase.from("watchlist").insert({ user_id: user.id, symbol: sym });
    if (error) return toast.error(error.message);
    toast.success("Added to watchlist");
    refetch();
  };

  const removeWatch = async (id: string) => {
    await supabase.from("watchlist").delete().eq("id", id);
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Live Trading</h1>
        <p className="text-muted-foreground">Real-time charts for stocks, crypto, and forex.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search e.g. NASDAQ:TSLA"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={() => custom && setSymbol(custom.toUpperCase())}>Load</Button>
            <Button variant="outline" onClick={() => addWatch(symbol)}><Star className="h-4 w-4 mr-2" />Watch</Button>
          </div>
          <TradingViewWidget symbol={symbol} />

          <Tabs defaultValue="stocks">
            <TabsList>
              <TabsTrigger value="stocks">Stocks</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
              <TabsTrigger value="forex">Forex</TabsTrigger>
            </TabsList>
            {(["stocks", "crypto", "forex"] as const).map((cat) => (
              <TabsContent key={cat} value={cat}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  {PRESETS[cat].map((s) => (
                    <Button key={s.sym} variant={symbol === s.sym ? "default" : "outline"} onClick={() => setSymbol(s.sym)}>
                      {s.label}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <Card className="p-6">
            <h2 className="font-semibold mb-3">Market News</h2>
            <ul className="space-y-3">
              {NEWS.map((n, i) => (
                <li key={i} className="text-sm border-b border-border/40 pb-2 last:border-0">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.source}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-5 h-fit">
          <h2 className="font-semibold mb-3">Watchlist</h2>
          {!user ? (
            <p className="text-sm text-muted-foreground">Sign in to track your favorite symbols.</p>
          ) : !watch?.length ? (
            <p className="text-sm text-muted-foreground">No symbols yet. Click Watch above.</p>
          ) : (
            <ul className="space-y-2">
              {watch.map((w) => (
                <li key={w.id} className="flex justify-between items-center text-sm">
                  <button onClick={() => setSymbol(w.symbol)} className="text-left hover:text-primary truncate">{w.symbol}</button>
                  <button onClick={() => removeWatch(w.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}