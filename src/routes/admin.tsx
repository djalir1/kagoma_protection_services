import { createFileRoute, redirect } from "@tanstack/react-router";

// Old address for the admin console. Everyone now signs in once and lands on
// the dashboard for their role.
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
