import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Tesla Secure Capital" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>({});
  const [pw, setPw] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "", country: profile.country ?? "" }); }, [profile]);

  if (!profile) return <div className="container mx-auto p-10 text-center text-muted-foreground">Loading...</div>;

  const save = async () => {
    const { error } = await supabase.from("profiles").update(form).eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refreshProfile();
  };

  const changePw = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPw("");
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Profile & Security</h1>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Personal information</h2>
        <div><Label>Email</Label><Input value={profile.email} disabled /></div>
        <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
        </div>
        <Button onClick={save}>Save changes</Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Change password</h2>
        <div><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button onClick={changePw} variant="outline">Update password</Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">Account status</h2>
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Status:</span> <span className="capitalize">{profile.status}</span></div>
          <div><span className="text-muted-foreground">KYC:</span> <span className="capitalize">{profile.kyc_status ?? "unverified"}</span></div>
          <div><span className="text-muted-foreground">Referral code:</span> <span className="font-mono text-primary">{profile.referral_code ?? "—"}</span></div>
        </div>
      </Card>
    </div>
  );
}