import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminId } from "@/features/admin/admin-tools";
import { getAdminCounts } from "@/lib/admin_queries";
import { getDashboardStats, getMyPayments, getWorkStats } from "@/lib/dashboard_queries";
import { getMyWorks } from "@/lib/panel_queries";
import { getCurrentPlan } from "@/lib/subscriptions_queries";
import { DASHBOARD_DAYS, getCompletionRate } from "@/features/dashboard/dashboard-options";
import { formatPrice } from "@/features/subscriptions/plans";
import { AdminHome } from "@/components/Admin/admin-home";
import { StatCard } from "@/components/Dashboard/stat-card";
import { WorkCharts } from "@/components/Dashboard/work-charts";
import { PremiumNotice } from "@/components/Premium/premium-notice";
import { cn } from "@/lib/utils";

interface MiPanelPageProps {
  searchParams: Promise<{ obra?: string }>;
}

// inicio de Mi panel: el admin ve su resumen; autores y traductores, su dashboard
export default async function MiPanelPage({ searchParams }: MiPanelPageProps) {
  const adminId = await getAdminId();
  if (adminId) {
    const counts = await getAdminCounts();
    return <AdminHome counts={counts} />;
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { obra } = await searchParams;
  const [stats, payments, works, plan] = await Promise.all([
    getDashboardStats(userId),
    getMyPayments(userId),
    getMyWorks(userId),
    getCurrentPlan(),
  ]);

  // las estadísticas por obra son de Premium y solo de obras aprobadas
  const isPremium = plan !== "free";
  const approvedWorks = works.filter((work) => work.moderationStatus === "approved");
  const selectedWork = approvedWorks.find((work) => work.id === obra) ?? approvedWorks[0];
  const workStats = isPremium && selectedWork ? await getWorkStats(selectedWork.id, DASHBOARD_DAYS) : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Tus números en NexoManga.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Obras publicadas" value={stats.totalWorks} />
        <StatCard label="Obras en curso" value={stats.activeWorks} />
        <StatCard label="Lecturas válidas" value={stats.validReadings} />
        <StatCard label="Ganancias" value={formatPrice(stats.income)} />
        <StatCard label="Seguidores" value={stats.followers} />
        <StatCard label="Comentarios en tus obras" value={stats.comments} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Últimos pagos</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no recibes pagos. Llegan con cada reparto.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>{payment.typeLabel}</span>
                <span className="text-muted-foreground">{payment.dateLabel}</span>
                <span className="font-semibold">{formatPrice(payment.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Estadísticas por obra · últimos {DASHBOARD_DAYS} días</h2>

        {!isPremium ? (
          <PremiumNotice message="Las estadísticas por obra (aperturas, lecturas completas, lecturas por día, retención por capítulo e idioma de lectura) son de Premium." />
        ) : !selectedWork || !workStats ? (
          <p className="text-sm text-muted-foreground">Todavía no tienes obras aprobadas.</p>
        ) : (
          <>
            {/* elegir la obra: cada botón recarga la página con ?obra= */}
            <div className="flex flex-wrap gap-2">
              {approvedWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/mi-panel?obra=${work.id}`}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-brand",
                    work.id === selectedWork.id ? "border-brand bg-brand text-white" : "border-border",
                  )}
                >
                  {work.title}
                </Link>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Aperturas" value={workStats.opens} />
              <StatCard label="Lecturas completas" value={workStats.completions} />
              <StatCard label="Tasa de finalización" value={`${getCompletionRate(workStats.opens, workStats.completions)} %`} />
              <StatCard
                label="Tiempo promedio por página"
                value={workStats.avgSecondsPerPage === null ? "—" : `${workStats.avgSecondsPerPage} s`}
              />
            </div>

            <WorkCharts daily={workStats.daily} retention={workStats.retention} languages={workStats.languages} />
          </>
        )}
      </section>
    </div>
  );
}
