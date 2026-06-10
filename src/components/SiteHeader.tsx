import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
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
          <a href="/#market" className="hover:text-foreground transition-colors">Market</a>
          {user && <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>}
          {isAdmin && <Link to="/admin" className="hover:text-foreground transition-colors">Admin</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
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