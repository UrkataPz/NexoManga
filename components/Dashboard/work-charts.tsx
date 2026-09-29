"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WorkStats } from "@/lib/dashboard_queries";

// colores de los gráficos (rosa de la marca y azul, revisados para daltonismo sobre fondo oscuro)
const PINK = "#ff2d6f";
const BLUE = "#1fa2d6";

// estilo compartido: ejes grises, cuadrícula tenue y globo de información oscuro
const axisProps = { tick: { fill: "#a3a3a3", fontSize: 12 }, tickLine: false, axisLine: false };
const tooltipProps = {
  contentStyle: { backgroundColor: "#0a0a0a", border: "1px solid #262626", borderRadius: 8 },
  labelStyle: { color: "#f5f5f5" },
  cursor: { fill: "rgba(255, 255, 255, 0.05)" },
};

// caja con título para cada gráfico; si no hay datos, lo dice
function ChartBox({ title, isEmpty, children }: { title: string; isEmpty: boolean; children: React.ReactElement }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {isEmpty ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay lecturas para mostrar.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}

// los 3 gráficos de una obra: lecturas por día, retención por capítulo e idioma de lectura
export function WorkCharts({ daily, retention, languages }: Pick<WorkStats, "daily" | "retention" | "languages">) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <ChartBox title="Lecturas por día" isEmpty={daily.every((row) => row.opens === 0)}>
          <LineChart data={daily} margin={{ left: -20, right: 8 }}>
            <CartesianGrid vertical={false} stroke="#262626" />
            <XAxis dataKey="day" {...axisProps} minTickGap={16} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip {...tooltipProps} />
            <Legend />
            <Line type="monotone" dataKey="opens" name="Aperturas" stroke={PINK} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="completions" name="Lecturas completas" stroke={BLUE} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartBox>
      </div>

      <ChartBox title="Lectores por capítulo (retención)" isEmpty={retention.every((row) => row.readers === 0)}>
        <BarChart data={retention} margin={{ left: -20, right: 8 }}>
          <CartesianGrid vertical={false} stroke="#262626" />
          <XAxis dataKey="chapter" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey="readers" name="Lectores" fill={PINK} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ChartBox>

      <ChartBox title="Idioma de lectura" isEmpty={languages.length === 0}>
        <BarChart data={languages} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#262626" />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey="language" width={80} {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey="reads" name="Aperturas" fill={PINK} radius={[0, 4, 4, 0]} maxBarSize={32} />
        </BarChart>
      </ChartBox>
    </div>
  );
}
