import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Tesla Secure Capital" }] }),
  component: Dashboard,
});

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

  if (!user || !profile) return <div className="container mx-auto p-10 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {profile.full_name || profile.email}</h1>
        <p className="text-muted-foreground">Manage your investments and track your earnings.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Balance" value={`$${Number(profile.balance).toLocaleString()}`} accent />
        <StatCard icon={ArrowDownToLine} label="Total Deposit" value={`$${Number(profile.total_deposit).toLocaleString()}`} />
        <StatCard icon={ArrowUpFromLine} label="Total Withdrawal" value={`$${Number(profile.total_withdrawal).toLocaleString()}`} />
        <StatCard icon={TrendingUp} label="Total Profit" value={`$${Number(profile.total_profit).toLocaleString()}`} />
      </div>

      <div className="flex flex-wrap gap-3">
        <TxDialog type="deposit" onDone={() => { refetchTx(); refreshProfile(); }} />
        <TxDialog type="withdrawal" onDone={() => { refetchTx(); refreshProfile(); }} maxAmount={profile.balance} />
        <InvestDialog plans={plans ?? []} balance={profile.balance} onDone={() => { refetchTx(); refreshProfile(); }} />
        <Link to="/profile"><Button variant="ghost">Profile</Button></Link>
        <Link to="/kyc"><Button variant="ghost">KYC</Button></Link>
        <Link to="/referrals"><Button variant="ghost">Referrals</Button></Link>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Recent Transactions</h2>
        {!txs?.length ? <p className="text-sm text-muted-foreground">No transactions yet.</p> : (
          <div className="space-y-2">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-border/50 py-2 text-sm">
                <div>
                  <div className="font-medium capitalize">{t.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} {t.method ? `· ${t.method}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${Number(t.amount).toLocaleString()}</div>
                  <Badge variant={t.status === "approved" || t.status === "completed" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>{t.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Wallet; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "border-primary" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
    </Card>
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
        <Button variant={type === "deposit" ? "default" : "outline"}>
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
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
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