// ============================================================
// components/dashboard/Trends.tsx
// Section : Tendances temporelles — Redesign Sprint 3
// ============================================================

"use client";

import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { SectionReveal, AnimatedTabContent } from "../motion/MotionComponents";
import type { YearStat, MonthStat, HourStat, DayStat } from "../../lib/queries/types";

type TrendTab = "yearly" | "monthly" | "hours" | "days";

interface TrendsProps {
  yearlyTrends: YearStat[];
  monthlyTrends: MonthStat[];
  byHour: HourStat[];
  byDayOfWeek: DayStat[];
}

function HoursTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">{payload[0].value.toLocaleString("fr-FR")}h</p>
    </div>
  );
}

function PlaysTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">{payload[0].value.toLocaleString("fr-FR")} écoutes</p>
    </div>
  );
}

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
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#1DB954" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#1DB954" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="year" tick={{ fill: "#6a6a6a", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6a6a6a", fontSize: 11 }} tickFormatter={(v) => `${v}h`} axisLine={false} tickLine={false} />
          <Tooltip content={<HoursTooltip />} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#1DB954"
            strokeWidth={2.5}
            fill="url(#gradGreen)"
            dot={{ fill: "#1DB954", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: "#1ed760" }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="trend-table" style={{ marginTop: "1.25rem" }}>
        <div className="trend-table__header">
          <span>Année</span><span>Heures</span><span>Écoutes</span><span>Artistes</span>
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
  const chartData = data.slice(-36).map((m) => ({
    label: m.monthLabel,
    hours: m.totalHours,
    plays: m.playCount,
  }));

  return (
    <div className="chart-wrapper">
      <p className="chart-caption">Heures d&apos;écoute par mois (36 derniers)</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 36, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6a6a6a", fontSize: 9 }}
            angle={-45}
            textAnchor="end"
            interval={2}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: "#6a6a6a", fontSize: 11 }} tickFormatter={(v) => `${v}h`} axisLine={false} tickLine={false} />
          <Tooltip content={<HoursTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="hours" fill="#1DB954" radius={[3, 3, 0, 0]} maxBarSize={20} />
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
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="label" tick={{ fill: "#6a6a6a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6a6a6a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<PlaysTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="playCount" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {data.map((entry, index) => {
              const intensity = maxPlays > 0 ? entry.playCount / maxPlays : 0;
              const isNight = entry.hour >= 0 && entry.hour <= 5;
              const color = isNight
                ? `rgba(182, 104, 255, ${0.3 + intensity * 0.7})`
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
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="dayLabel" tick={{ fill: "#b3b3b3", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6a6a6a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<PlaysTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="playCount" radius={[5, 5, 0, 0]} maxBarSize={40}>
            {data.map((entry, index) => {
              const intensity = maxPlays > 0 ? entry.playCount / maxPlays : 0;
              return <Cell key={index} fill={`rgba(29, 185, 84, ${0.2 + intensity * 0.8})`} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Trends({ yearlyTrends, monthlyTrends, byHour, byDayOfWeek }: TrendsProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>("yearly");

  const tabs: { key: TrendTab; label: string; icon: string }[] = [
    { key: "yearly",  label: "Par année", icon: "📆" },
    { key: "monthly", label: "Par mois",  icon: "📅" },
    { key: "hours",   label: "Par heure", icon: "🕐" },
    { key: "days",    label: "Par jour",  icon: "📊" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "yearly":  return <YearlyChart  data={yearlyTrends}  />;
      case "monthly": return <MonthlyChart data={monthlyTrends} />;
      case "hours":   return <HourChart    data={byHour}        />;
      case "days":    return <DayChart     data={byDayOfWeek}   />;
    }
  };

  return (
    <SectionReveal delay={0.15}>
      <section className="dashboard-section" aria-labelledby="trends-title">
        <h2 id="trends-title" className="section-title">Tendances</h2>

        <div className="tabs" role="tablist">
          {tabs.map((tab) => (
            <motion.button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`tab-btn ${activeTab === tab.key ? "tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              whileTap={{ scale: 0.95 }}
            >
              <span>{tab.icon}</span> {tab.label}
            </motion.button>
          ))}
        </div>

        <AnimatedTabContent tabKey={activeTab} className="tab-content">
          {renderContent()}
        </AnimatedTabContent>
      </section>
    </SectionReveal>
  );
}
