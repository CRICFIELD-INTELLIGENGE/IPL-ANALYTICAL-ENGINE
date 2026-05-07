import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
  glow = false,
  delay = 0,
}: { children: ReactNode; className?: string; glow?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={`glass rounded-2xl ${glow ? "neon-border" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}
