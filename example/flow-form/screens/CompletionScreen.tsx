import { Check } from 'lucide-react'
import { motion } from 'motion/react'

interface CompletionScreenProps {
  title?: string
  subtitle?: string
}

export function CompletionScreen({
  title = 'Thank you!',
  subtitle = 'Your response has been recorded.',
}: CompletionScreenProps) {
  return (
    <div className="ff-completion">
      <motion.div
        className="ff-checkmark"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
      >
        <Check className="size-8" strokeWidth={2.5} />
      </motion.div>
      <h2 className="ff-title ff-title-lg">{title}</h2>
      <p className="ff-description">{subtitle}</p>
    </div>
  )
}
