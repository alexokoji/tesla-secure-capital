import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Zap, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Tesla Secure Capital" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email")), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Password reset email sent");
  };

  return (
    <div className="min-h-svh bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl glass-card animate-pulse-glow mb-3">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tesla-gradient-text">Reset Your Password</h1>
          <p className="text-sm text-muted-foreground mt-1">We'll email you a secure reset link</p>
        </div>
        <div className="glass-card glow-border rounded-2xl p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <Mail className="h-10 w-10 mx-auto text-primary" />
              <p className="text-sm">Check your inbox for the reset link.</p>
              <Link to="/auth"><Button variant="outline" className="w-full"><ArrowLeft className="h-4 w-4" /> Back to sign in</Button></Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="em">Email Address</Label>
                <Input id="em" name="email" type="email" required placeholder="you@tesla.com"
                  className="h-11 rounded-xl bg-black/30 border-primary/20" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl animate-pulse-glow" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Link to="/auth" className="text-xs text-primary hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}