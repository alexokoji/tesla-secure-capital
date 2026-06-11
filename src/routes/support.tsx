import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Headphones, Clock, Shield } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Live Support — Tesla Secure Capital" }] }),
  component: SupportPage,
});

function openChat() {
  const w = window as any;
  if (typeof w.smartsupp === "function") {
    try { w.smartsupp("chat:open"); return; } catch {}
  }
  // Fallback: try again shortly while script loads
  setTimeout(() => {
    const w2 = window as any;
    if (typeof w2.smartsupp === "function") w2.smartsupp("chat:open");
  }, 800);
}

function SupportPage() {
  useEffect(() => {
    const t = setTimeout(openChat, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <Card className="p-10 text-center space-y-6 glass-panel">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center neon-glow">
          <Headphones className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Live Support</h1>
          <p className="text-muted-foreground">
            Chat directly with our team in real time. We're here to help with deposits, withdrawals, investments, and account questions.
          </p>
        </div>

        <Button size="lg" onClick={openChat} className="gap-2">
          <MessageCircle className="w-5 h-5" />
          Start Live Chat
        </Button>

        <div className="grid sm:grid-cols-3 gap-4 pt-6 text-sm">
          <div className="flex flex-col items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-medium">24/7 Availability</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-medium">Secure & Private</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="font-medium">Instant Replies</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
