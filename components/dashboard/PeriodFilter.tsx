// ============================================================
// components/dashboard/PeriodFilter.tsx
// Sélecteur de période — Pills style Spotify, Sprint 3
// ============================================================

"use client";

import { motion } from "framer-motion";
import { PERIOD_OPTIONS, type PeriodKey } from "../../lib/queries/types";

interface PeriodFilterProps {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  disabled?: boolean;
}

export function PeriodFilter({ value, onChange, disabled }: PeriodFilterProps) {
  return (
    <div className="period-filter">
      <span className="period-filter__label">Période :</span>
      <div className="period-filter__options" role="group" aria-label="Sélection de période">
        {PERIOD_OPTIONS.map((opt) => (
          <motion.button
            key={opt.key}
            className={`period-filter__btn ${value === opt.key ? "period-filter__btn--active" : ""}`}
            onClick={() => onChange(opt.key)}
            disabled={disabled}
            aria-pressed={value === opt.key}
            whileTap={!disabled ? { scale: 0.93 } : {}}
            transition={{ duration: 0.12 }}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
