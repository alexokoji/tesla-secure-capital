import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Tesla Secure Capital" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: String(fd.get("full_name")) },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-center mb-1">Tesla Secure Capital</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">Access your investment dashboard</p>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div><Label htmlFor="le">Email</Label><Input id="le" name="email" type="email" required /></div>
              <div><Label htmlFor="lp">Password</Label><Input id="lp" name="password" type="password" required minLength={6} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "..." : "Login"}</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 mt-4">
              <div><Label htmlFor="sn">Full name</Label><Input id="sn" name="full_name" required /></div>
              <div><Label htmlFor="se">Email</Label><Input id="se" name="email" type="email" required /></div>
              <div><Label htmlFor="sp">Password</Label><Input id="sp" name="password" type="password" required minLength={8} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "..." : "Create Account"}</Button>
              <p className="text-xs text-muted-foreground text-center">First account becomes the admin.</p>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}