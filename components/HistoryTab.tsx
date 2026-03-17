'use client'

import { useState, useEffect } from 'react'
import type { Campaign } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(start: string, end?: string) {
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function HistoryTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-12 text-[#8c909e]">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Loading history...
    </div>
  )

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#e8e5e0]">Campaign History</h2>
        <span className="text-xs text-[#8c909e] bg-[#1d1e26] border border-[#30313e] px-2.5 py-1 rounded-full">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[#1d1e26] border border-[#30313e] rounded-xl p-10 text-center">
          <p className="text-sm text-[#8c909e]">No campaigns yet.</p>
          <p className="text-xs text-[#4a4b5a] mt-1">Send your first campaign from the Send tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const isExpanded = expanded.has(campaign.id)
            const duration   = formatDuration(campaign.started_at, campaign.completed_at)
            const successRate = campaign.total > 0 ? Math.round((campaign.sent / campaign.total) * 100) : 0

            return (
              <div key={campaign.id} className="bg-[#1d1e26] border border-[#30313e] rounded-xl overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      campaign.status === 'complete' ? 'bg-[#34d399]' :
                      campaign.status === 'running'  ? 'bg-[#7c6af5] animate-pulse' :
                      'bg-[#f87171]'
                    }`} />

                    <div className="flex-1 min-w-0">
                      {/* Subject */}
                      <p className="text-sm font-medium text-[#e8e5e0] truncate">{campaign.subject || 'No subject'}</p>
                      {/* Meta */}
                      <p className="text-xs text-[#8c909e] mt-0.5">{formatDate(campaign.started_at)}{duration && ` · ${duration}`}</p>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-semibold font-mono text-[#34d399]">{campaign.sent}</span>
                          <span className="text-xs text-[#8c909e]">sent</span>
                        </div>
                        {campaign.failed > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg font-semibold font-mono text-[#f87171]">{campaign.failed}</span>
                            <span className="text-xs text-[#8c909e]">failed</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-semibold font-mono text-[#8c909e]">{campaign.total}</span>
                          <span className="text-xs text-[#8c909e]">total</span>
                        </div>
                        {/* Progress bar */}
                        <div className="flex-1 h-1.5 bg-[#252630] rounded-full overflow-hidden ml-2">
                          <div className="h-full bg-[#34d399] rounded-full transition-all" style={{ width: `${successRate}%` }} />
                        </div>
                        <span className="text-xs text-[#8c909e]">{successRate}%</span>
                      </div>
                    </div>

                    <button onClick={() => toggleExpand(campaign.id)}
                      className="text-xs text-[#8c909e] hover:text-[#e8e5e0] transition-colors px-2.5 py-1 rounded-lg hover:bg-[#252630] shrink-0">
                      {isExpanded ? '↑ Hide' : '↓ Details'}
                    </button>
                  </div>
                </div>

                {/* Expanded results */}
                {isExpanded && (
                  <div className="border-t border-[#30313e]">
                    <div className="divide-y divide-[#27283380] max-h-64 overflow-y-auto">
                      {campaign.results.length === 0 ? (
                        <p className="px-5 py-3 text-xs text-[#8c909e]">No results recorded.</p>
                      ) : campaign.results.map((r, i) => (
                        <div key={i} className={`flex items-center gap-3 px-5 py-2.5 text-xs ${
                          r.status === 'sent' ? 'bg-[#13141a]' : 'bg-[#f8717108]'
                        }`}>
                          <span className={`font-mono font-bold shrink-0 ${r.status === 'sent' ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                            {r.status === 'sent' ? '✓' : '✗'}
                          </span>
                          <span className="text-[#e8e5e0] font-medium">{r.business_name}</span>
                          <span className="font-mono text-[#8c909e]">{r.email}</span>
                          {r.error && <span className="text-[#f87171] ml-auto truncate max-w-[200px]">{r.error}</span>}
                          <span className="text-[#4a4b5a] ml-auto shrink-0">
                            {new Date(r.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
