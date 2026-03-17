import type { LeadStatus } from '@/types'

const styles: Record<LeadStatus, string> = {
  pending: 'bg-[#1e1e1e] text-[#6b6b6b] border border-[#2a2a2a]',
  emailed: 'bg-[#0d2318] text-[#3ecf8e] border border-[#1a3a28]',
  skip: 'bg-[#2a1800] text-[#f59e0b] border border-[#3a2200]',
}

const labels: Record<LeadStatus, string> = {
  pending: 'Not contacted',
  emailed: 'Emailed',
  skip: 'Skip',
}

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
