import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { EmptyState } from "@/components/app/kit";

export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { profile } = useAuth();
  if (!profile || !roles.includes(profile.role)) {
    return (
      <EmptyState
        icon={Lock}
        title="This page is not part of your account"
        hint="It belongs to a different type of account."
        action={
          <Link
            to="/dashboard"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Back to my dashboard
          </Link>
        }
      />
    );
  }
  return <>{children}</>;
}

export const LEARNER: Role[] = ["student", "professional"];
export const STAFF: Role[] = ["staff", "admin"];
export const ADMIN: Role[] = ["admin"];
