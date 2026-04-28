import type { Transition, Variants } from "framer-motion";

export const springSnap: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 28,
};

export const easeOutQuint: Transition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: easeOutQuint },
};

export const stagger = (delay = 0.04): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: delay },
  },
});

export const dragLift = {
  whileDrag: {
    scale: 1.04,
    rotate: -1,
    boxShadow:
      "0 28px 48px -12px rgb(15 23 42 / 0.28), 0 8px 16px -4px rgb(15 23 42 / 0.12)",
    transition: springSnap,
  },
};

export const pillBounce: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 500, damping: 22 },
  },
};
