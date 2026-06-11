import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — Tesla Secure Capital" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password"));
    const cp = String(fd.get("confirm"));
    if (pw !== cp) return toast.error("Passwords do not match");
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-svh bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl glass-card animate-pulse-glow mb-3">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tesla-gradient-text">Set a New Password</h1>
        </div>
        <div className="glass-card glow-border rounded-2xl p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="np">New Password</Label>
              <div className="relative">
                <Input id="np" name="password" type={show ? "text" : "password"} required minLength={8}
                  className="h-11 rounded-xl bg-black/30 border-primary/20 pr-10" />
                <button type="button" onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf">Confirm Password</Label>
              <Input id="cf" name="confirm" type={show ? "text" : "password"} required minLength={8}
                className="h-11 rounded-xl bg-black/30 border-primary/20" />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl animate-pulse-glow" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}