import type { LeadStatus } from '@/types'

const styles: Record<LeadStatus, string> = {
  pending: 'bg-[#252630] text-[#8c909e] border border-[#30313e]',
  emailed: 'bg-[#34d39918] text-[#34d399] border border-[#34d39940]',
  skip:    'bg-[#f59e0b18] text-[#f59e0b] border border-[#f59e0b40]',
}

const labels: Record<LeadStatus, string> = {
  pending: 'Not contacted',
  emailed: 'Emailed',
  skip:    'Skip',
}

const dots: Record<LeadStatus, string> = {
  pending: 'bg-[#4a4b5a]',
  emailed: 'bg-[#34d399]',
  skip:    'bg-[#f59e0b]',
}

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  )
}
