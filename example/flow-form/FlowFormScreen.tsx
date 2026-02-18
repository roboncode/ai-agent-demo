/**
 * FlowForm.Screen — marker component.
 * Never renders itself; FlowForm reads its props to build the screen list.
 */
interface FlowFormScreenProps {
  id: string
  validation?: () => boolean
  autoAdvance?: boolean
  children: React.ReactNode
}

export function FlowFormScreen(_props: FlowFormScreenProps): React.ReactNode {
  return null
}
