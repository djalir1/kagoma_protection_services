import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Role = "student" | "professional" | "employer" | "client" | "staff" | "admin";

export type Profile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: Role;
  vetting_status: "pending" | "approved" | "rejected" | "suspended";
  phone: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  gender: string | null;
  country_name: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  address_line: string | null;
  headline: string | null;
  listed: boolean;
  available: boolean;
  staff_title: string | null;
  created_at: string;
};

export type Capabilities = {
  signed_in: boolean;
  role?: Role;
  name?: string;
  vetting?: string;
  courses?: number;
  certificates?: number;
  can_be_listed?: boolean;
  listed?: boolean;
  is_staff?: boolean;
  is_admin?: boolean;
};

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  caps: Capabilities | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [caps, setCaps] = useState<Capabilities | null>(null);

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setCaps(null);
      return;
    }
    const [p, c] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase.rpc("my_capabilities"),
    ]);
    setProfile((p.data as Profile) ?? null);
    setCaps((c.data as Capabilities) ?? null);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await load(data.session);
      if (alive) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // defer: supabase-js forbids awaiting other calls inside this callback
        setTimeout(() => load(s), 0);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      caps,
      refresh: () => load(session),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setCaps(null);
      },
    }),
    [ready, session, profile, caps, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const isStaffRole = (r?: Role | null) => r === "staff" || r === "admin";
export const isLearnerRole = (r?: Role | null) => r === "student" || r === "professional";

export const roleLabel: Record<Role, string> = {
  student: "Learner",
  professional: "Professional",
  employer: "Employer",
  client: "Client",
  staff: "Staff",
  admin: "Administrator",
};
