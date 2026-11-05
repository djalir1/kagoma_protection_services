import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { LearnerHome } from "@/components/dashboards/learner-home";
import { EmployerHome } from "@/components/dashboards/employer-home";
import { ClientHome } from "@/components/dashboards/client-home";
import { StaffHome } from "@/components/dashboards/staff-home";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const { profile } = useAuth();
  switch (profile?.role) {
    case "employer":
      return <EmployerHome />;
    case "client":
      return <ClientHome />;
    case "staff":
    case "admin":
      return <StaffHome />;
    default:
      return <LearnerHome />;
  }
}
