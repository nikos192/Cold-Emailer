'use client'

import { useState, useEffect } from 'react'
import type { Campaign } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return <div className="text-sm text-[#6b6b6b] py-8">Loading history...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#f0ede8]">Campaign History</h2>
        <span className="text-xs text-[#6b6b6b]">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</span>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded p-8 text-center text-sm text-[#6b6b6b]">
          No campaigns yet. Send your first campaign from the Send tab.
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const isExpanded = expanded.has(campaign.id)
            return (
              <div key={campaign.id} className="bg-[#111111] border border-[#1e1e1e] rounded overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          campaign.status === 'complete'
                            ? 'bg-[#0d2318] text-[#3ecf8e] border border-[#1a3a28]'
                            : campaign.status === 'running'
                            ? 'bg-[#0d1a2a] text-[#3b82f6] border border-[#1a2a3a]'
                            : 'bg-[#1a0000] text-red-400 border border-[#2a0000]'
                        }`}
                      >
                        {campaign.status}
                      </span>
                      <span className="text-xs text-[#6b6b6b]">{formatDate(campaign.started_at)}</span>
                    </div>
                    <p className="text-sm text-[#f0ede8] mt-1 truncate">{campaign.subject || 'No subject'}</p>
                    <div className="flex gap-4 mt-1.5 text-xs text-[#6b6b6b]">
                      <span><span className="text-[#3ecf8e]">{campaign.sent}</span> sent</span>
                      {campaign.failed > 0 && (
                        <span><span className="text-red-400">{campaign.failed}</span> failed</span>
                      )}
                      <span>{campaign.total} total</span>
                      {campaign.completed_at && (
                        <span>Completed {formatDate(campaign.completed_at)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpand(campaign.id)}
                    className="text-xs text-[#6b6b6b] hover:text-[#f0ede8] transition-colors shrink-0 mt-0.5"
                  >
                    {isExpanded ? 'Collapse ↑' : 'Details ↓'}
                  </button>
                </div>

                {/* Expanded results */}
                {isExpanded && (
                  <div className="border-t border-[#1e1e1e]">
                    <div className="divide-y divide-[#161616]">
                      {campaign.results.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-[#6b6b6b]">No results recorded.</p>
                      ) : (
                        campaign.results.map((r, i) => (
                          <div key={i} className="px-4 py-2 flex items-center gap-3 text-xs">
                            {r.status === 'sent' ? (
                              <span className="text-[#3ecf8e] font-mono shrink-0">✓</span>
                            ) : (
                              <span className="text-red-400 font-mono shrink-0">✗</span>
                            )}
                            <span className="text-[#f0ede8] font-medium">{r.business_name}</span>
                            <span className="font-mono text-[#6b6b6b]">{r.email}</span>
                            {r.error && (
                              <span className="text-red-400 ml-auto">{r.error}</span>
                            )}
                            <span className="text-[#3a3a3a] ml-auto shrink-0">
                              {new Date(r.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
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
