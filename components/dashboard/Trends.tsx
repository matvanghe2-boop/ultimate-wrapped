// ============================================================
// components/dashboard/Trends.tsx
// Section : Tendances temporelles — Yearly, Monthly, Hour, Day
// Ultimate Wrapped — Sprint 2
// ============================================================

"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { YearStat, MonthStat, HourStat, DayStat } from "../../lib/queries/types";

type TrendTab = "yearly" | "monthly" | "hours" | "days";

interface TrendsProps {
  yearlyTrends: YearStat[];
  monthlyTrends: MonthStat[];
  byHour: HourStat[];
  byDayOfWeek: DayStat[];
}

// ============================================================
// TOOLTIP
// ============================================================

function HoursTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">{payload[0].value.toLocaleString("fr-FR")}h</p>
    </div>
  );
}

function PlaysTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">{payload[0].value.toLocaleString("fr-FR")} écoutes</p>
    </div>
  );
}

// ============================================================
// GRAPHIQUES
// ============================================================

function YearlyChart({ data }: { data: YearStat[] }) {
  if (data.length === 0) return <p className="empty-state">Aucune donnée</p>;

  const chartData = data.map((y) => ({
    year: String(y.year),
    hours: y.totalHours,
    plays: y.playCount,
    artists: y.uniqueArtists,
  }));

  return (
    <div className="chart-wrapper">
      <p className="chart-caption">Heures d&apos;écoute par année</p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1DB954" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1DB954" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" tick={{ fill: "#aaa", fontSize: 12 }} />
          <YAxis tick={{ fill: "#aaa", fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
          <Tooltip content={<HoursTooltip />} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#1DB954"
            strokeWidth={2}
            fill="url(#gradGreen)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats table */}
      <div className="trend-table">
        <div className="trend-table__header">
          <span>Année</span>
          <span>Heures</span>
          <span>Écoutes</span>
          <span>Artistes</span>
        </div>
        {data.map((y) => (
          <div key={y.year} className="trend-table__row">
            <span className="trend-table__year">{y.year}</span>
            <span>{y.totalHours.toLocaleString("fr-FR")}h</span>
            <span>{y.playCount.toLocaleString("fr-FR")}</span>
            <span>{y.uniqueArtists.toLocaleString("fr-FR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyChart({ data }: { data: MonthStat[] }) {
  if (data.length === 0) return <p className="empty-state">Aucune donnée</p>;

  // Limiter à 36 derniers mois pour la lisibilité
  const chartData = data.slice(-36).map((m) => ({
    label: m.monthLabel,
    hours: m.totalHours,
    plays: m.playCount,
  }));

  return (
    <div className="chart-wrapper">
      <p className="chart-caption">Heures d&apos;écoute par mois (36 derniers)</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 32, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#aaa", fontSize: 9 }}
            angle={-45}
            textAnchor="end"
            interval={2}
          />
          <YAxis tick={{ fill: "#aaa", fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
          <Tooltip content={<HoursTooltip />} />
          <Bar dataKey="hours" fill="#1DB954" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourChart({ data }: { data: HourStat[] }) {
  if (data.length === 0) return <p className="empty-state">Aucune donnée</p>;

  const maxPlays = Math.max(...data.map((h) => h.playCount));

  return (
    <div className="chart-wrapper">
      <p className="chart-caption">Écoutes par heure de la journée</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fill: "#aaa", fontSize: 11 }} />
          <YAxis tick={{ fill: "#aaa", fontSize: 11 }} />
          <Tooltip content={<PlaysTooltip />} />
          <Bar dataKey="playCount" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => {
              const intensity = maxPlays > 0 ? entry.playCount / maxPlays : 0;
              const isNight = entry.hour >= 0 && entry.hour <= 5;
              const color = isNight
                ? `rgba(147, 51, 234, ${0.3 + intensity * 0.7})`
                : `rgba(29, 185, 84, ${0.3 + intensity * 0.7})`;
              return <Cell key={index} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="chart-legend">
        <span className="legend-dot legend-dot--green" /> Journée &nbsp;
        <span className="legend-dot legend-dot--purple" /> Nuit (0h–5h)
      </p>
    </div>
  );
}

function DayChart({ data }: { data: DayStat[] }) {
  if (data.length === 0) return <p className="empty-state">Aucune donnée</p>;

  const maxPlays = Math.max(...data.map((d) => d.playCount));

  return (
    <div className="chart-wrapper">
      <p className="chart-caption">Écoutes par jour de la semaine</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="dayLabel" tick={{ fill: "#ddd", fontSize: 12 }} />
          <YAxis tick={{ fill: "#aaa", fontSize: 11 }} />
          <Tooltip content={<PlaysTooltip />} />
          <Bar dataKey="playCount" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => {
              const intensity = maxPlays > 0 ? entry.playCount / maxPlays : 0;
              return (
                <Cell
                  key={index}
                  fill={`rgba(29, 185, 84, ${0.2 + intensity * 0.8})`}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function Trends({
  yearlyTrends,
  monthlyTrends,
  byHour,
  byDayOfWeek,
}: TrendsProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>("yearly");

  const tabs: { key: TrendTab; label: string; icon: string }[] = [
    { key: "yearly",  label: "Par année", icon: "📆" },
    { key: "monthly", label: "Par mois",  icon: "📅" },
    { key: "hours",   label: "Par heure", icon: "🕐" },
    { key: "days",    label: "Par jour",  icon: "📊" },
  ];

  return (
    <section className="dashboard-section" aria-labelledby="trends-title">
      <h2 id="trends-title" className="section-title">Tendances</h2>

      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`tab-btn ${activeTab === tab.key ? "tab-btn--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content" role="tabpanel">
        {activeTab === "yearly"  && <YearlyChart  data={yearlyTrends}  />}
        {activeTab === "monthly" && <MonthlyChart data={monthlyTrends} />}
        {activeTab === "hours"   && <HourChart    data={byHour}        />}
        {activeTab === "days"    && <DayChart      data={byDayOfWeek}   />}
      </div>
    </section>
  );
}
