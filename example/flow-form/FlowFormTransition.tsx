import { AnimatePresence, motion } from 'motion/react'

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
}

const reducedMotionTransition = { duration: 0.15 }

const SLIDE_OFFSET = 60

// Variant functions receive the `custom` value (direction) at animation time,
// so exiting components always get the CURRENT direction, not the stale one.
const slideVariants = {
  initial: (dir: number) => ({ y: dir * SLIDE_OFFSET, opacity: 0 }),
  animate: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: dir * -SLIDE_OFFSET, opacity: 0 }),
}

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

interface FlowFormTransitionProps {
  children: React.ReactNode
  screenKey: string
  direction: 1 | -1
}

export function FlowFormTransition({
  children,
  screenKey,
  direction,
}: FlowFormTransitionProps) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const variants = prefersReducedMotion ? fadeVariants : slideVariants

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={screenKey}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={prefersReducedMotion ? reducedMotionTransition : springTransition}
        className="ff-screen-container"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
