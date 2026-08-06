import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  referral_code: string;
  balance_cents: number;
  total_earned_cents: number;
  xp: number;
  level: number;
  status: string;
  two_factor_enabled: boolean;
  bio: string | null;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  deposit_deadline: string | null;
  okx_wallet: string | null;
  okx_wallet_locked: boolean;
};
type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  hasDeposit: boolean | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function claimReferralIfPending(uid: string) {
  let ref: string | null = null;
  try { ref = localStorage.getItem("pendingReferralCode"); } catch {}
  if (!ref) {
    try { ref = sessionStorage.getItem("cbx_ref"); } catch {}
  }
  if (!ref) return;
  try {
    // Only claim if this user hasn't already been attributed to a referrer.
    const { data: profile } = await supabase
      .from("profiles")
      .select("referred_by")
      .eq("id", uid)
      .maybeSingle();
    if (!profile || profile.referred_by == null) {
      try {
        await supabase.rpc("claim_referral_code", { p_code: ref });
      } catch {}
    }
  } catch {}
  // Always clear the pending code, success or failure, to avoid retry loops.
  try { localStorage.removeItem("pendingReferralCode"); } catch {}
  try { sessionStorage.removeItem("cbx_ref"); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [depositState, setDepositState] = useState<{
    userId: string;
    hasDeposit: boolean;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const authGeneration = useRef(0);
  const activeUserId = useRef<string | null>(null);
  const loadExtras = async (uid: string) => {
    const generation = authGeneration.current;
    const [{ data: p }, { data: roles }, { count: depositCount, error: depositError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("deposits").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);
    if (generation !== authGeneration.current) return;
    setProfile(p as Profile | null);
    setDepositState(depositError ? null : {
      userId: uid,
      hasDeposit: (depositCount ?? 0) > 0,
    });
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  };
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      // Opening a native file/camera picker backgrounds the mobile browser.
      // Supabase can emit INITIAL_SESSION or TOKEN_REFRESHED when the app
      // returns. Re-hydrating auth for those events unmounts every protected
      // page and destroys non-serializable state such as an attached File.
      // The access token is still kept current in `session`; only identity
      // transitions need the full profile/loading reset.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        setSession(sess);
        setUser(sess?.user ?? null);
        activeUserId.current = sess?.user.id ?? null;
        return;
      }

      // SIGNED_IN may also fire when an existing mobile session merely
      // regains focus after the native picker closes. It is not an identity
      // change, so preserve the mounted route and its selected File object.
      if (sess?.user && activeUserId.current === sess.user.id) {
        setSession(sess);
        setUser(sess.user);
        return;
      }

      authGeneration.current += 1;
      activeUserId.current = sess?.user.id ?? null;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setLoading(true);
        setProfile(null);
        setDepositState(null);
        setTimeout(() => loadExtras(sess.user.id).finally(() => setLoading(false)), 0);
        if (event === "SIGNED_IN") {
          setTimeout(() => {
            claimReferralIfPending(sess.user.id).then(() => loadExtras(sess.user.id));
          }, 0);
        }
      } else {
        setProfile(null);
        setDepositState(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      authGeneration.current += 1;
      activeUserId.current = s?.user.id ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setProfile(null);
        setDepositState(null);
        claimReferralIfPending(s.user.id);
        loadExtras(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const refreshProfile = async () => {
    if (user) await loadExtras(user.id);
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };
  const hasDeposit = user && depositState?.userId === user.id
    ? depositState.hasDeposit
    : null;
  // Inactivity auto-logout: sign out after 30 minutes with no user interaction
  useEffect(() => {
    if (!user) return;
    const INACTIVITY_MS = 30 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.auth.signOut();
      }, INACTIVITY_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", reset);
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", reset);
    };
  }, [user]);
  return (
    <AuthContext.Provider value={{ user, session, profile, hasDeposit, isAdmin, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
