import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Gift, Users } from "lucide-react";

export const Route = createFileRoute("/referrals")({
  head: () => ({ meta: [{ title: "Referrals — Tesla Secure Capital" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const { data: refs } = useQuery({
    queryKey: ["refs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,email,full_name,total_deposit,created_at").eq("referrer_id", user!.id);
      return data ?? [];
    },
  });

  if (!profile) return null;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/auth?mode=signup&ref=${profile.referral_code}`;
  const commissionRate = 0.1;
  const totalCommission = (refs ?? []).reduce((s, r: any) => s + Number(r.total_deposit || 0) * commissionRate, 0);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Gift className="h-7 w-7 text-primary" /> Referral Program</h1>
        <p className="text-muted-foreground">Earn 10% commission on every deposit your referrals make — for life.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Total Referrals</div><div className="mt-2 text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{refs?.length ?? 0}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Commission Earned</div><div className="mt-2 text-2xl font-bold text-primary">${totalCommission.toLocaleString()}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground">Your Code</div><div className="mt-2 text-2xl font-bold font-mono text-primary">{profile.referral_code}</div></Card>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Your referral link</h2>
        <div className="flex gap-2">
          <Input value={link} readOnly />
          <Button onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied!"); }}><Copy className="h-4 w-4 mr-2" />Copy</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Your referrals</h2>
        {!refs?.length ? <p className="text-sm text-muted-foreground">No referrals yet. Share your link to start earning.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border"><tr><th className="py-2">User</th><th>Joined</th><th>Deposits</th><th>Your Commission</th></tr></thead>
            <tbody>
              {refs.map((r: any) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="py-2"><div className="font-medium">{r.full_name || "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div></td>
                  <td className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>${Number(r.total_deposit).toLocaleString()}</td>
                  <td className="text-primary font-semibold">${(Number(r.total_deposit) * commissionRate).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}