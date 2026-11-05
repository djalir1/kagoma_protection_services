import { supabase } from "@/lib/supabase";

export type Course = {
  id: string;
  title: string;
  title_rw: string | null;
  description: string | null;
  description_rw: string | null;
  track: "core" | "ep";
  practical: boolean;
  spec_en: string | null;
  sort_order: number;
  study_hours: number | null;
  certificate_fee_rwf: number | null;
  fee_rwf: number | null;
  min_age: number | null;
  overview: string | null;
};

export type Enrollment = {
  id: string;
  course_id: string;
  status: "enrolled" | "in_progress" | "completed";
  progress: number;
  enrolled_at: string;
  completed_at: string | null;
  courses: Course | null;
};

export async function fetchCourses() {
  const { data, error } = await supabase.from("courses").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function fetchMyEnrollments(userId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*, courses(*)")
    .eq("student_id", userId)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Enrollment[];
}

export type Certificate = {
  id: string;
  certificate_number: string;
  course_id: string;
  course_name: string;
  student_name: string;
  issue_date: string;
  expiry_date: string | null;
  status: "valid" | "suspended" | "revoked";
  level: string;
  final_score: number | null;
  verify_token: string | null;
};

export async function fetchMyCertificates(userId: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("student_id", userId)
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Certificate[];
}

export type CertificateClaim = {
  course_id: string;
  course: string;
  score: number;
  fee: number;
  paid: number;
  pending: number;
  issued: boolean;
  blocked: { eligible: boolean; reasons: { code: string; course?: string; need?: number }[] };
};

export async function fetchClaims() {
  const { data, error } = await supabase.rpc("my_certificate_claims");
  if (error) throw error;
  return (data ?? []) as CertificateClaim[];
}

export const reasonText = (r: { code: string; course?: string; need?: number }) =>
  ({
    not_vetted: "Kagoma has not yet confirmed your identity",
    no_dob: "Add your date of birth in Account",
    underage: `You must be at least ${r.need} years old`,
    missing_prerequisite: `First complete ${r.course}`,
  })[r.code] ?? r.code;
