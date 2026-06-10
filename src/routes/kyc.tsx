import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/kyc")({
  head: () => ({ meta: [{ title: "KYC Verification — Tesla Secure Capital" }] }),
  component: KycPage,
});

function KycPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [docType, setDocType] = useState("passport");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (profile?.full_name) setFullName(profile.full_name); }, [profile]);

  const { data: subs, refetch } = useQuery({
    queryKey: ["kyc", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!file || !fullName.trim()) return toast.error("Full name and document required");
    setSubmitting(true);
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("kyc-docs").upload(path, file);
    if (upErr) { setSubmitting(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("kyc_submissions").insert({ user_id: user!.id, full_name: fullName, document_type: docType, document_path: path });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted — admin will review shortly.");
    setFile(null); refetch();
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" /> KYC Verification</h1>
        <p className="text-muted-foreground">Verify your identity to unlock higher withdrawal limits.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div><Label>Full legal name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div>
          <Label>Document type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="drivers_license">Driver's License</SelectItem>
              <SelectItem value="national_id">National ID</SelectItem>
              <SelectItem value="proof_of_address">Proof of Address</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Document file (image or PDF, max 10MB)</Label>
          <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button onClick={submit} disabled={submitting}>{submitting ? "Uploading..." : "Submit for review"}</Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Your submissions</h2>
        {!subs?.length ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : (
          <div className="space-y-2">
            {subs.map((s) => (
              <div key={s.id} className="flex justify-between items-center border-b border-border/40 pb-2 text-sm">
                <div>
                  <div className="font-medium capitalize">{s.document_type.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                </div>
                <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>{s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}