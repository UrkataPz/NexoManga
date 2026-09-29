import { createClient } from "@/lib/supabase/server";
import { getLanguageLabel } from "@/features/chapters/chapter-options";
import { PAYMENT_TYPE_LABELS } from "@/features/dashboard/dashboard-options";

export interface DashboardStats {
  totalWorks: number;
  activeWorks: number;
  validReadings: number;
  income: number;
  comments: number;
  followers: number;
}

// números generales: obras, lecturas válidas, ganancias, comentarios y seguidores
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = await createClient();

  const [{ data: stats, error }, { data: followers }] = await Promise.all([
    supabase.rpc("get_author_dashboard_stats", { p_author_id: userId }).maybeSingle(),
    supabase.rpc("get_follower_count", { p_author_id: userId }),
  ]);
  if (error) console.error(error);

  const row = stats as {
    total_works: number;
    active_works: number;
    valid_readings: number;
    total_income: number;
    total_comments: number;
  } | null;

  return {
    totalWorks: Number(row?.total_works ?? 0),
    activeWorks: Number(row?.active_works ?? 0),
    validReadings: Number(row?.valid_readings ?? 0),
    income: Number(row?.total_income ?? 0),
    comments: Number(row?.total_comments ?? 0),
    followers: Number(followers ?? 0),
  };
}

export interface MyPayment {
  id: string;
  typeLabel: string;
  amount: number;
  dateLabel: string;
}

// los últimos pagos que recibió el usuario
export async function getMyPayments(userId: string): Promise<MyPayment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, amount, created_at")
    .eq("target_user_id", userId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    typeLabel: PAYMENT_TYPE_LABELS[row.type] ?? row.type,
    amount: Number(row.amount),
    dateLabel: new Date(row.created_at).toLocaleDateString("es", { dateStyle: "medium" }),
  }));
}

export interface WorkStats {
  opens: number;
  completions: number;
  avgSecondsPerPage: number | null;
  daily: { day: string; opens: number; completions: number }[];
  retention: { chapter: string; readers: number }[];
  languages: { language: string; reads: number }[];
}

// estadísticas de una obra en los últimos días (lecturas por día, retención e idioma)
export async function getWorkStats(workId: string, days: number): Promise<WorkStats> {
  const supabase = await createClient();
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const [totals, daily, retention, languages] = await Promise.all([
    supabase
      .rpc("get_work_reading_stats", { p_work_id: workId, p_start: start.toISOString(), p_end: end.toISOString() })
      .maybeSingle(),
    supabase.rpc("get_work_daily_reads", {
      p_work_id: workId,
      p_start: start.toISOString().slice(0, 10),
      p_end: end.toISOString().slice(0, 10),
    }),
    supabase.rpc("get_work_chapter_retention", { p_work_id: workId }),
    supabase.rpc("get_work_language_breakdown", { p_work_id: workId }),
  ]);

  const total = totals.data as { total_opens: number; total_completions: number; avg_ms_visible: number | null } | null;
  const dailyRows = (daily.data ?? []) as { day: string; opens: number; completions: number }[];
  const retentionRows = (retention.data ?? []) as { chapter_number: number; unique_readers: number }[];
  const languageRows = (languages.data ?? []) as { language: string; reads: number }[];

  return {
    opens: Number(total?.total_opens ?? 0),
    completions: Number(total?.total_completions ?? 0),
    avgSecondsPerPage: total?.avg_ms_visible ? Math.round(Number(total.avg_ms_visible) / 100) / 10 : null,
    // "2026-09-10" → "10/09"
    daily: dailyRows.map((row) => ({
      day: `${row.day.slice(8, 10)}/${row.day.slice(5, 7)}`,
      opens: Number(row.opens),
      completions: Number(row.completions),
    })),
    retention: retentionRows.map((row) => ({ chapter: `Cap. ${Number(row.chapter_number)}`, readers: Number(row.unique_readers) })),
    languages: languageRows.map((row) => ({ language: getLanguageLabel(row.language), reads: Number(row.reads) })),
  };
}
