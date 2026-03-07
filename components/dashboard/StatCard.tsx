// ============================================================
// components/dashboard/StatCard.tsx
// Widget générique pour afficher un KPI
// Ultimate Wrapped — Sprint 2
// ============================================================

"use client";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  accent?: "green" | "red" | "yellow" | "blue" | "purple";
  size?: "sm" | "md" | "lg";
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "green",
  size = "md",
}: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${accent} stat-card--${size}`}>
      {icon && <div className="stat-card__icon">{icon}</div>}
      <div className="stat-card__body">
        <p className="stat-card__title">{title}</p>
        <p className="stat-card__value">{value}</p>
        {subtitle && <p className="stat-card__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
