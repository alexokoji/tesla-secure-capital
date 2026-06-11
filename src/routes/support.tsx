import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Headphones, Plus, MessageCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — Tesla Secure Capital" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const { data: tickets, refetch } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Headphones className="h-7 w-7 text-primary" /> Support</h1>
          <p className="text-muted-foreground">Open a ticket and our team will reply here. We're available 24/7.</p>
        </div>
        <NewTicketDialog onCreated={(id) => { refetch(); setActive(id); }} />
      </div>

      {active ? (
        <TicketThread ticketId={active} onBack={() => { setActive(null); refetch(); }} />
      ) : (
        <Card className="p-6">
          <h2 className="font-semibold mb-3">Your tickets</h2>
          {!tickets?.length ? (
            <p className="text-sm text-muted-foreground">No tickets yet. Click "New ticket" to get help.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setActive(t.id)} className="w-full text-left py-3 flex items-center justify-between hover:bg-accent/40 rounded px-2 -mx-2">
                    <div>
                      <div className="font-medium">{t.subject}</div>
                      <div className="text-xs text-muted-foreground">Updated {new Date(t.updated_at).toLocaleString()}</div>
                    </div>
                    <Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function NewTicketDialog({ onCreated }: { onCreated: (ticketId: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return toast.error("Subject and message are required");
    setBusy(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({ user_id: user!.id, subject: subject.trim() })
        .select()
        .single();
      if (error) throw error;
      const { error: msgErr } = await supabase
        .from("ticket_messages")
        .insert({ ticket_id: ticket.id, sender_id: user!.id, is_admin: false, body: message.trim() });
      if (msgErr) throw msgErr;
      toast.success("Ticket created — we'll reply shortly.");
      setOpen(false); setSubject(""); setMessage("");
      onCreated(ticket.id);
    } catch (e: any) {
      toast.error(e.message ?? "Could not create ticket");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> New ticket</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Open a support ticket</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Withdrawal not received" /></div>
          <div><Label>How can we help?</Label><Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue in detail…" /></div>
          <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Submitting…" : "Submit ticket"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TicketThread({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { user } = useAuth();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => (await supabase.from("support_tickets").select("*").eq("id", ticketId).maybeSingle()).data,
  });

  const { data: msgs, refetch } = useQuery({
    queryKey: ["ticket-msgs", ticketId],
    refetchInterval: 15000,
    queryFn: async () => (await supabase.from("ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at")).data ?? [],
  });

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, sender_id: user!.id, is_admin: false, body: reply.trim() });
      if (error) throw error;
      await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticketId);
      setReply(""); refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Could not send message");
    } finally {
      setBusy(false);
    }
  };

  const closed = ticket?.status === "closed";

  return (
    <Card className="p-6 min-h-[480px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="text-right">
          <div className="font-semibold">{ticket?.subject}</div>
          <Badge variant={closed ? "secondary" : "default"} className="mt-0.5">{ticket?.status}</Badge>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {!msgs?.length ? (
          <div className="m-auto text-sm text-muted-foreground text-center pt-10"><MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />No messages yet.</div>
        ) : msgs.map((m: any) => (
          <div key={m.id} className={`flex ${m.is_admin ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.is_admin ? "bg-accent" : "bg-primary text-primary-foreground"}`}>
              <div className="text-xs opacity-70 mb-1">{m.is_admin ? "Support" : "You"} · {new Date(m.created_at).toLocaleString()}</div>
              {m.body}
            </div>
          </div>
        ))}
      </div>

      {closed ? (
        <p className="text-sm text-muted-foreground text-center mt-4">This ticket is closed. Open a new ticket if you need more help.</p>
      ) : (
        <div className="mt-4 flex gap-2">
          <Input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type your reply…" />
          <Button onClick={send} disabled={busy}>Send</Button>
        </div>
      )}
    </Card>
  );
}
