import {
  LayoutDashboard,
  BookOpen,
  Library,
  Award,
  Wallet,
  Briefcase,
  UserRound,
  Users,
  MessageSquare,
  ClipboardList,
  Building2,
  CalendarDays,
  UsersRound,
  FileText,
  ShieldCheck,
  ListChecks,
  Receipt,
  Hammer,
  KeyRound,
  Settings,
  Database,
  BarChart3,
  Languages,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth";

export type NavLink = { to: string; label: string; icon: LucideIcon; exact?: boolean };
export type NavGroup = { label?: string; items: NavLink[] };

const overview: NavLink = {
  to: "/dashboard",
  label: "Overview",
  icon: LayoutDashboard,
  exact: true,
};
const account: NavLink = { to: "/dashboard/account", label: "Account", icon: UserRound };

export function navFor(role: Role): NavGroup[] {
  switch (role) {
    case "student":
    case "professional":
      return [
        { items: [overview] },
        {
          label: "Learning",
          items: [
            { to: "/dashboard/learning", label: "My learning", icon: BookOpen },
            { to: "/dashboard/catalog", label: "Course catalogue", icon: Library },
            { to: "/dashboard/certificates", label: "Certificates", icon: Award },
            { to: "/dashboard/payments", label: "Payments", icon: Wallet },
          ],
        },
        {
          label: "Career",
          items: [
            { to: "/dashboard/career", label: "Professional profile", icon: Briefcase },
            { to: "/dashboard/jobs", label: "Jobs", icon: ClipboardList },
            { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
          ],
        },
        { items: [account] },
      ];
    case "employer":
      return [
        { items: [overview] },
        {
          label: "Hiring",
          items: [
            { to: "/dashboard/talent", label: "Find professionals", icon: Users },
            { to: "/dashboard/jobs", label: "Jobs", icon: ClipboardList },
            { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
            { to: "/dashboard/recruitment", label: "Recruitment requests", icon: Briefcase },
          ],
        },
        {
          label: "Services",
          items: [{ to: "/dashboard/requests", label: "Security requests", icon: ShieldCheck }],
        },
        { items: [account] },
      ];
    case "client":
      return [
        { items: [overview] },
        {
          label: "Services",
          items: [{ to: "/dashboard/requests", label: "Security requests", icon: ShieldCheck }],
        },
        { items: [account] },
      ];
    case "staff":
    case "admin": {
      const groups: NavGroup[] = [
        { items: [overview] },
        {
          label: "Operations",
          items: [
            { to: "/dashboard/requests", label: "Service requests", icon: ShieldCheck },
            { to: "/dashboard/clients", label: "Clients & billing", icon: Building2 },
            { to: "/dashboard/events", label: "Events", icon: CalendarDays },
            { to: "/dashboard/pool", label: "Talent pool", icon: UsersRound },
            { to: "/dashboard/documents", label: "Documents", icon: FileText },
          ],
        },
      ];
      if (role === "admin") {
        groups.push(
          {
            label: "Academy",
            items: [
              { to: "/dashboard/vetting", label: "Vetting", icon: ListChecks },
              { to: "/dashboard/applications", label: "Applications", icon: ClipboardList },
              { to: "/dashboard/payments", label: "Payments", icon: Receipt },
              { to: "/dashboard/practical", label: "Practical assessments", icon: Hammer },
              { to: "/dashboard/certificates", label: "Certificates", icon: Award },
              { to: "/dashboard/translations", label: "Kinyarwanda review", icon: Languages },
            ],
          },
          {
            label: "Administration",
            items: [
              { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
              { to: "/dashboard/team", label: "Team & access", icon: KeyRound },
              { to: "/dashboard/settings", label: "Company settings", icon: Settings },
              { to: "/dashboard/data", label: "Data explorer", icon: Database },
            ],
          },
        );
      }
      groups.push({ items: [account] });
      return groups;
    }
  }
}
