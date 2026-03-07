// ============================================================
// components/motion/MotionComponents.tsx
// Wrappers Framer Motion réutilisables — Ultimate Wrapped Sprint 3
// ============================================================
// Installation requise : npm install framer-motion
// ============================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from "framer-motion";

// ============================================================
// VARIANTS PARTAGÉS
// ============================================================

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
  },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

// ============================================================
// SECTION WRAPPER — fade-in au scroll
// ============================================================

interface SectionRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function SectionReveal({ children, className, delay = 0 }: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 32 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
            delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// STAGGER LIST — animation en cascade sur les enfants
// ============================================================

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerList({ children, className, delay = 0 }: StaggerListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.07,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

// ============================================================
// ANIMATED NUMBER — compteur qui défile de 0 à la valeur cible
// ============================================================

interface AnimatedNumberProps {
  value: number;
  duration?: number;       // ms
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  locale?: string;
}

export function AnimatedNumber({
  value,
  duration = 1600,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
  locale = "fr-FR",
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration,
    bounce: 0,
  });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (v) => {
      setDisplay(
        decimals > 0
          ? v.toLocaleString(locale, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
          : Math.round(v).toLocaleString(locale)
      );
    });
    return unsubscribe;
  }, [springValue, decimals, locale]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}

// ============================================================
// TAB CONTENT — transition AnimatePresence
// ============================================================

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabKey: string;
  className?: string;
}

export function AnimatedTabContent({ children, tabKey, className }: AnimatedTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        className={className}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// PROGRESS BAR ANIMÉE
// ============================================================

interface AnimatedBarProps {
  percent: number;     // 0–100
  color?: string;
  height?: number;     // px
  delay?: number;      // s
  className?: string;
}

export function AnimatedBar({
  percent,
  color = "#1DB954",
  height = 4,
  delay = 0,
  className,
}: AnimatedBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        height,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 9999,
        overflow: "hidden",
      }}
    >
      <motion.div
        style={{
          height: "100%",
          background: color,
          borderRadius: 9999,
          originX: 0,
        }}
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: percent / 100 } : { scaleX: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.4, 0, 0.2, 1],
          delay,
        }}
      />
    </div>
  );
}

// ============================================================
// PAGE TRANSITION WRAPPER
// ============================================================

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// MODAL OVERLAY ANIMÉ
// ============================================================

interface AnimatedOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function AnimatedOverlay({ isOpen, onClose, children }: AnimatedOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="wrapped-card-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
