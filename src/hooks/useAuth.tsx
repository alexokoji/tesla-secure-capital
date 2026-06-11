import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  balance: number;
  total_deposit: number;
  total_withdrawal: number;
  total_profit: number;
  status: string;
  referral_code?: string | null;
  referrer_id?: string | null;
  kyc_status?: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  /** true once the initial profile fetch has completed (success or failure) */
  profileLoaded: boolean;
  /** populated when the profile row could not be loaded */
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = async (uid: string) => {
    try {
      const [{ data: prof, error: profErr }, { data: roles, error: roleErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (profErr) throw profErr;
      if (roleErr) console.error("[auth] failed to load roles:", roleErr.message);
      if (!prof) {
        console.error("[auth] no profile row found for user", uid);
        setProfileError("Your account profile could not be found. Please contact support.");
      } else {
        setProfileError(null);
      }
      setProfile((prof as Profile | null) ?? null);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    } catch (e: any) {
      console.error("[auth] failed to load profile:", e?.message ?? e);
      setProfile(null);
      setProfileError(e?.message ?? "Failed to load your profile.");
    } finally {
      setProfileLoaded(true);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setProfileError(null);
        setProfileLoaded(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id);
      } else {
        setProfileLoaded(true);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, isAdmin, loading, profileLoaded, profileError, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}