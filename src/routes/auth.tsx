import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, Shield, Lock, Zap, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Gift } from "lucide-react";
import modelS from "@/assets/tesla-model-s.jpg";
import modelX from "@/assets/tesla-model-x.jpg";
import modelY from "@/assets/tesla-model-y.jpg";
import cybertruck from "@/assets/tesla-cybertruck.jpg";

const SLIDES = [
  { img: modelS, name: "Model S Plaid" },
  { img: modelX, name: "Model X Plaid" },
  { img: modelY, name: "Model Y Performance" },
  { img: cybertruck, name: "Cybertruck" },
];

const COUNTRIES = [
  { code: "US", flag: "🇺🇸", name: "United States" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "FR", flag: "🇫🇷", name: "France" },
  { code: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "MX", flag: "🇲🇽", name: "Mexico" },
  { code: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "CN", flag: "🇨🇳", name: "China" },
  { code: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "OTHER", flag: "🌍", name: "Other" },
];

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Tesla Secure Capital" }] }),
  component: AuthPage,
});

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map = [
    { label: "Very weak", color: "bg-red-500" },
    { label: "Weak", color: "bg-orange-500" },
    { label: "Fair", color: "bg-yellow-500" },
    { label: "Good", color: "bg-blue-500" },
    { label: "Strong", color: "bg-emerald-500" },
    { label: "Excellent", color: "bg-emerald-400" },
  ];
  return { score: s, ...map[s] };
}

function AuthPage() {
  const { mode, ref } = useSearch({ from: "/auth" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [loading, setLoading] = useState(false);
  const [slide, setSlide] = useState(0);

  // login state
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [remember, setRemember] = useState(true);

  // signup state
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("US");
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  useEffect(() => {
    const t = setInterval(() => setSlide((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const particles = useMemo(
    () => Array.from({ length: 20 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 10,
      size: 2 + Math.random() * 3,
      key: i,
    })),
    [],
  );

  const strength = passwordStrength(pw);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwMatch = pw.length > 0 && pw === confirmPw;

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
    toast.success("Welcome back, Investor!");
    navigate({ to: "/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!agree) return toast.error("Please agree to the Terms & Privacy Policy");
    if (pw !== confirmPw) return toast.error("Passwords do not match");
    if (strength.score < 3) return toast.error("Please use a stronger password");

    const firstName = String(fd.get("first_name") || "").trim();
    const lastName = String(fd.get("last_name") || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const username = String(fd.get("username") || "").trim();

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: pw,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          username,
          phone: String(fd.get("phone") || ""),
          country,
          referral_code: ref ?? String(fd.get("referral") || "") ?? null,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);

    if (data.session) {
      // Email confirmation is disabled — the user is already signed in.
      toast.success("🎉 Welcome to Tesla Secure Capital!");
      navigate({ to: "/dashboard" });
    } else {
      // Email confirmation is required — no session yet. Point them to their inbox.
      toast.success("Account created! Check your email to confirm, then sign in.");
      setTab("login");
    }
  };

  return (
    <div className="relative min-h-svh overflow-hidden bg-black text-foreground">
      {/* Background slideshow */}
      <div className="absolute inset-0">
        {SLIDES.map((s, i) => (
          <div
            key={s.name}
            className="absolute inset-0 transition-opacity duration-[2000ms]"
            style={{ opacity: i === slide ? 0.45 : 0 }}
          >
            <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black" />
        <div className="absolute inset-0 floating-grid-bg opacity-30 animate-grid-pan" />
      </div>

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.key}
            className="absolute rounded-full bg-primary/70"
            style={{
              left: `${p.left}%`,
              bottom: 0,
              width: p.size,
              height: p.size,
              boxShadow: "0 0 12px 2px oklch(0.7 0.22 240 / 0.7)",
              animation: `particle-rise ${p.duration}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Carousel controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
        <button onClick={() => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)} className="h-9 w-9 rounded-full glass-card flex items-center justify-center hover:text-primary">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-2">
          {SLIDES.map((s, i) => (
            <button key={s.name} onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${i === slide ? "w-10 bg-primary shadow-[0_0_12px_oklch(0.7_0.22_240)]" : "w-4 bg-white/20"}`} />
          ))}
        </div>
        <button onClick={() => setSlide((s) => (s + 1) % SLIDES.length)} className="h-9 w-9 rounded-full glass-card flex items-center justify-center hover:text-primary">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 min-h-svh flex items-center justify-center">
        <div className="w-full max-w-xl">
          {/* Animated logo & header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl glass-card animate-pulse-glow mb-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tesla-gradient-text">Tesla Secure Capital</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {tab === "login" ? "Welcome back, Investor — access your portfolio" : "Become a Tesla Investor today"}
            </p>
          </div>

          <div className="glass-card glow-border rounded-2xl p-6 md:p-8 backdrop-blur-2xl">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 bg-black/40">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="le">Email Address</Label>
                    <Input id="le" name="email" type="email" required placeholder="you@tesla.com"
                      className="h-11 rounded-xl bg-black/30 border-primary/20 focus-visible:ring-primary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lp">Password</Label>
                    <div className="relative">
                      <Input id="lp" name="password" type={showLoginPw ? "text" : "password"} required minLength={6}
                        placeholder="••••••••"
                        className="h-11 rounded-xl bg-black/30 border-primary/20 focus-visible:ring-primary/50 pr-10" />
                      <button type="button" onClick={() => setShowLoginPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                        {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                      <span className="text-muted-foreground">Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
                  </div>

                  <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold animate-pulse-glow transition-transform hover:scale-[1.01]" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Sign In Securely</span>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> Secure Login</span>
                    <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3 text-primary" /> 256-bit SSL</span>
                  </div>
                </form>
              </TabsContent>

              {/* SIGNUP */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-6">
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span><strong className="tesla-gradient-text">Tesla Investor Welcome:</strong> Get a $25 sign-up bonus and unlock daily ROI plans.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="fn">First Name</Label>
                      <Input id="fn" name="first_name" required placeholder="Elon" className="h-11 rounded-xl bg-black/30 border-primary/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ln">Last Name</Label>
                      <Input id="ln" name="last_name" required placeholder="Musk" className="h-11 rounded-xl bg-black/30 border-primary/20" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="un">Username</Label>
                    <Input id="un" name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+"
                      placeholder="elonmusk"
                      className="h-11 rounded-xl bg-black/30 border-primary/20" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="se">Email Address</Label>
                    <div className="relative">
                      <Input id="se" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@tesla.com"
                        className="h-11 rounded-xl bg-black/30 border-primary/20 pr-10" />
                      {email.length > 0 && emailValid && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="ph">Phone Number</Label>
                      <Input id="ph" name="phone" type="tel" required placeholder="+1 555 0000" className="h-11 rounded-xl bg-black/30 border-primary/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="co">Country</Label>
                      <select id="co" value={country} onChange={(e) => setCountry(e.target.value)}
                        className="h-11 w-full rounded-xl bg-black/30 border border-primary/20 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50">
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sp">Password</Label>
                    <div className="relative">
                      <Input id="sp" type={showPw ? "text" : "password"} required minLength={8}
                        value={pw} onChange={(e) => setPw(e.target.value)}
                        placeholder="At least 8 characters"
                        className="h-11 rounded-xl bg-black/30 border-primary/20 pr-10" />
                      <button type="button" onClick={() => setShowPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pw.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.color : "bg-white/10"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Strength: <span className="text-foreground">{strength.label}</span></p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cp">Confirm Password</Label>
                    <div className="relative">
                      <Input id="cp" type={showConfirm ? "text" : "password"} required
                        value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                        className="h-11 rounded-xl bg-black/30 border-primary/20 pr-10" />
                      <button type="button" onClick={() => setShowConfirm((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPw.length > 0 && (
                      <p className={`text-xs ${pwMatch ? "text-emerald-400" : "text-red-400"}`}>
                        {pwMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rc" className="flex items-center gap-2"><Gift className="h-3 w-3 text-primary" /> Referral Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="rc" name="referral" defaultValue={ref ?? ""} placeholder="Enter referral code for bonus"
                      className="h-11 rounded-xl bg-black/30 border-primary/20" />
                    {ref && <p className="text-xs text-primary">🎁 Referral bonus active — you'll get +5% on first deposit.</p>}
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer text-sm">
                    <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
                    <span className="text-muted-foreground">
                      I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                    </span>
                  </label>

                  <Button type="submit" className="w-full h-11 rounded-xl text-base font-semibold animate-pulse-glow transition-transform hover:scale-[1.01]" disabled={loading || !agree}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Create Investor Account</span>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-4 pt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> Email verified</span>
                    <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3 text-primary" /> Bank-grade encryption</span>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Protected by 256-bit SSL · Tesla Secure Capital © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}