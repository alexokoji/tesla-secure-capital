import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Zap, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const { data: unread } = useQuery({
    queryKey: ["unread-notifs", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("read", false).eq("user_id", user!.id);
      return count ?? 0;
    },
  });
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Zap className="h-6 w-6 text-primary" />
          <span>Tesla<span className="text-primary">Secure</span>Capital</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <a href="/#plans" className="hover:text-foreground transition-colors">Plans</a>
          <Link to="/trading" className="hover:text-foreground transition-colors">Trading</Link>
          <a href="/#faq" className="hover:text-foreground transition-colors">FAQ</a>
          {user && <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>}
          {user && <Link to="/referrals" className="hover:text-foreground transition-colors">Referrals</Link>}
          {user && <Link to="/support" className="hover:text-foreground transition-colors">Support</Link>}
          {isAdmin && <Link to="/admin" className="hover:text-foreground transition-colors">Admin</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/notifications" className="relative p-2 rounded-md hover:bg-accent">
                <Bell className="h-4 w-4" />
                {!!unread && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{unread}</span>}
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}