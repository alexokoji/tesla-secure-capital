import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Tesla Secure Capital" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const { data: items, refetch } = useQuery({
    queryKey: ["notifs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Bell className="h-7 w-7 text-primary" /> Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
      </div>
      {!items?.length ? (
        <Card className="p-10 text-center text-muted-foreground">You have no notifications yet.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className={`p-4 ${!n.read && !n.broadcast ? "border-primary/40" : ""}`}>
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-semibold">{n.title}</div>
                  <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}