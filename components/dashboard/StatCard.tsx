// ============================================================
// components/dashboard/StatCard.tsx
// Widget KPI — Redesign Sprint 3 avec compteur animé
// ============================================================

"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "../motion/MotionComponents";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  accent?: "green" | "red" | "yellow" | "blue" | "purple";
  size?: "sm" | "md" | "lg";
  /** Si fourni, affiche un compteur animé au lieu de la valeur statique */
  animatedValue?: number;
  animatedSuffix?: string;
  animatedDecimals?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "green",
  size = "md",
  animatedValue,
  animatedSuffix = "",
  animatedDecimals = 0,
}: StatCardProps) {
  return (
    <motion.div
      className={`stat-card stat-card--${accent} stat-card--${size}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {icon && <div className="stat-card__icon">{icon}</div>}
      <div className="stat-card__body">
        <p className="stat-card__title">{title}</p>
        <p className="stat-card__value">
          {animatedValue !== undefined ? (
            <AnimatedNumber
              value={animatedValue}
              suffix={animatedSuffix}
              decimals={animatedDecimals}
              duration={1400}
            />
          ) : (
            value
          )}
        </p>
        {subtitle && <p className="stat-card__subtitle">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
