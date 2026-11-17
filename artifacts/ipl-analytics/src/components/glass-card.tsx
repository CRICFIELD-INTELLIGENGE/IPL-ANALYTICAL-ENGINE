import { motion } from "framer-motion";
import type { MouseEventHandler, ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
  glow = false,
  delay = 0,
  onClick,
  id,
}: { children: ReactNode; className?: string; glow?: boolean; delay?: number; onClick?: MouseEventHandler<HTMLDivElement>; id?: string }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={`glass rounded-xl ${glow ? "neon-border" : ""} ${className} overflow-hidden`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
