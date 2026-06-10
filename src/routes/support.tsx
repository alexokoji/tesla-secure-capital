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
import { toast } from "sonner";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — Tesla Secure Capital" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const { data: tickets, refetch } = useQuery({
    queryKey: ["tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages, refetch: refetchMsgs } = useQuery({
    queryKey: ["ticket-msgs", active],
    enabled: !!active,
    queryFn: async () => {
      const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", active!).order("created_at");
      return data ?? [];
    },
  });

  const createTicket = async () => {
    if (!subject.trim() || !body.trim()) return toast.error("Subject and message required");
    const { data, error } = await supabase.from("support_tickets").insert({ user_id: user!.id, subject }).select().single();
    if (error || !data) return toast.error(error?.message ?? "Failed");
    await supabase.from("ticket_messages").insert({ ticket_id: data.id, sender_id: user!.id, is_admin: false, body });
    toast.success("Ticket opened");
    setSubject(""); setBody(""); setActive(data.id); refetch();
  };

  const sendReply = async () => {
    if (!reply.trim() || !active) return;
    await supabase.from("ticket_messages").insert({ ticket_id: active, sender_id: user!.id, is_admin: isAdmin, body: reply });
    await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", active);
    setReply(""); refetchMsgs();
  };

  return (
    <div className="container mx-auto px-4 py-10 grid lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">New ticket</h2>
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Describe your issue..." value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          <Button onClick={createTicket} className="w-full">Open ticket</Button>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Your tickets</h2>
          {!tickets?.length ? <p className="text-sm text-muted-foreground">No tickets yet.</p> : (
            <ul className="space-y-1">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setActive(t.id)} className={`w-full text-left p-2 rounded text-sm ${active === t.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                    <div className="font-medium truncate">{t.subject}</div>
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{new Date(t.updated_at).toLocaleDateString()}</span><Badge variant={t.status === "open" ? "default" : "secondary"} className="text-[10px]">{t.status}</Badge></div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-6 min-h-[500px] flex flex-col">
        {!active ? (
          <div className="m-auto text-center text-muted-foreground">Select or open a ticket to start chatting with support.</div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {messages?.map((m) => (
                <div key={m.id} className={`flex ${m.is_admin ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.is_admin ? "bg-accent" : "bg-primary text-primary-foreground"}`}>
                    <div className="text-xs opacity-70 mb-1">{m.is_admin ? "Support" : "You"} · {new Date(m.created_at).toLocaleString()}</div>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Type a reply..." />
              <Button onClick={sendReply}>Send</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}