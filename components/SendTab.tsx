'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import StatusBadge from './StatusBadge'
import type { Lead, Campaign } from '@/types'

const MAX_VERCEL_SECONDS = 300

export default function SendTab() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [delay, setDelay] = useState(45)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
  const [done, setDone] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  async function loadLeads() {
    const res = await fetch('/api/leads')
    const data = await res.json()
    setLeads(data.leads ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadLeads()
    checkActive()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkActive() {
    const res = await fetch('/api/campaigns/active')
    const data = await res.json()
    if (data.campaign) { setActiveCampaign(data.campaign); setSending(true); startPolling() }
  }

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch('/api/campaigns/active')
      const data = await res.json()
      if (data.campaign) {
        setActiveCampaign(data.campaign)
      } else {
        stopPolling(); setSending(false); setDone(true); loadLeads()
      }
    }, 2000)
  }, [stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  const pendingLeads  = leads.filter((l) => l.status === 'pending')
  const emailedLeads  = leads.filter((l) => l.status === 'emailed')
  const skipLeads     = leads.filter((l) => l.status === 'skip')
  const selectedLeads = leads.filter((l) => selected.has(l.id))
  const alreadyEmailedSelected = selectedLeads.filter((l) => l.status === 'emailed')
  const estimatedSeconds = selectedLeads.length > 1 ? (selectedLeads.length - 1) * delay : 0
  const exceedsLimit = estimatedSeconds > MAX_VERCEL_SECONDS

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function startSend() {
    setShowModal(false); setSending(true); setDone(false); setActiveCampaign(null)
    startPolling()
    try {
      await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadIds: [...selected], delay }) })
    } catch (err) { console.error('Send error:', err) }
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-12 text-[#8c909e]">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Loading...
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-base font-semibold text-[#e8e5e0]">Send Campaign</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total leads',     value: leads.length,        color: 'text-[#e8e5e0]' },
          { label: 'Not contacted',   value: pendingLeads.length,  color: 'text-[#e8e5e0]' },
          { label: 'Already emailed', value: emailedLeads.length,  color: 'text-[#34d399]' },
          { label: 'Skipped',         value: skipLeads.length,     color: 'text-[#f59e0b]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#1d1e26] border border-[#30313e] rounded-xl p-4">
            <div className={`text-2xl font-semibold font-mono ${color}`}>{value}</div>
            <div className="text-xs text-[#8c909e] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Lead selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#8c909e] uppercase tracking-widest">Select recipients</p>
          <div className="flex gap-1.5">
            <button onClick={() => setSelected(new Set(pendingLeads.map((l) => l.id)))}
              className="text-xs px-3 py-1.5 bg-[#1d1e26] border border-[#30313e] rounded-lg text-[#8c909e] hover:text-[#e8e5e0] hover:border-[#7c6af5] transition-all">
              Not contacted ({pendingLeads.length})
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-1.5 text-[#8c909e] hover:text-[#e8e5e0] transition-colors rounded-lg hover:bg-[#252630]">
              Clear
            </button>
          </div>
        </div>
        <div className="border border-[#30313e] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
          <table className="w-full">
            <tbody className="divide-y divide-[#27283380]">
              {leads.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-sm text-[#8c909e]">No leads yet. Import some in the Leads tab.</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} onClick={() => toggleSelect(lead.id)}
                  className={`cursor-pointer transition-colors hover:bg-[#1d1e26] ${selected.has(lead.id) ? 'bg-[#7c6af508]' : 'bg-[#13141a]'}`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => {}} className="accent-[#7c6af5] w-3.5 h-3.5" />
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium text-[#e8e5e0]">{lead.business_name}</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-[#8c909e]">{lead.email}</td>
                  <td className="px-3 py-2.5 text-right pr-4"><StatusBadge status={lead.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected.size > 0 && (
          <p className="text-xs text-[#8c909e]">{selected.size} lead{selected.size !== 1 ? 's' : ''} selected</p>
        )}
      </div>

      {/* Delay slider */}
      <div className="bg-[#1d1e26] border border-[#30313e] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#8c909e] uppercase tracking-widest">Delay between sends</p>
          <span className="text-sm font-mono font-semibold text-[#e8e5e0]">{delay}s</span>
        </div>
        <input type="range" min={15} max={120} step={5} value={delay} onChange={(e) => setDelay(Number(e.target.value))}
          className="w-full accent-[#7c6af5]" />
        <div className="flex justify-between text-xs text-[#4a4b5a]">
          <span>15s (faster)</span>
          <span>(safer) 120s</span>
        </div>
        {selected.size > 0 && (
          <p className="text-xs text-[#8c909e]">
            Estimated time: <span className="text-[#c5c2bc]">~{estimatedSeconds < 60 ? `${estimatedSeconds}s` : `${Math.round(estimatedSeconds / 60)}min ${estimatedSeconds % 60}s`}</span>
            {exceedsLimit && <span className="text-[#f59e0b] ml-2">⚠ exceeds 5-min Vercel limit</span>}
          </p>
        )}
      </div>

      {/* Send button */}
      <button onClick={() => setShowModal(true)} disabled={selected.size === 0 || sending}
        className="flex items-center gap-2 px-6 py-3 bg-[#7c6af5] text-white rounded-xl font-medium text-sm hover:bg-[#6d5ce6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        {sending ? (
          <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending...</>
        ) : `Send to ${selected.size} lead${selected.size !== 1 ? 's' : ''} →`}
      </button>

      {/* Send log */}
      {(sending || done) && (
        <div className="border border-[#30313e] rounded-xl overflow-hidden">
          <div className="bg-[#1d1e26] px-4 py-3 border-b border-[#30313e] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8c909e] uppercase tracking-widest">Send Log</span>
            {activeCampaign && sending && (
              <span className="text-xs text-[#8c909e] font-mono flex items-center gap-1.5">
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {activeCampaign.results.length} / {activeCampaign.total}
              </span>
            )}
            {done && activeCampaign && (
              <span className="text-xs font-mono">
                <span className="text-[#34d399]">{activeCampaign.sent} sent</span>
                {activeCampaign.failed > 0 && <span className="text-[#f87171] ml-2">{activeCampaign.failed} failed</span>}
              </span>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto bg-[#0e0f14] p-3 space-y-1.5 font-mono text-xs">
            {activeCampaign?.results.length === 0 && sending && (
              <p className="text-[#4a4b5a]">Preparing first send...</p>
            )}
            {activeCampaign?.results.map((r, i) => (
              <div key={i} className={r.status === 'sent' ? 'text-[#34d399]' : 'text-[#f87171]'}>
                {r.status === 'sent'
                  ? `✓  ${r.business_name} — ${r.email}`
                  : `✗  ${r.business_name} — ${r.error}`}
              </div>
            ))}
            {done && <div className="text-[#8c909e] pt-1 border-t border-[#30313e]">Campaign complete.</div>}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[#1d1e26] border border-[#30313e] rounded-2xl w-full max-w-md mx-4 p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-base font-semibold text-[#e8e5e0]">Confirm Campaign</h3>
              <p className="text-xs text-[#8c909e] mt-1">{selectedLeads.length} email{selectedLeads.length !== 1 ? 's' : ''} will be sent</p>
            </div>

            {alreadyEmailedSelected.length > 0 && (
              <div className="p-3 bg-[#f59e0b15] border border-[#f59e0b30] rounded-xl text-xs text-[#f59e0b]">
                ⚠ {alreadyEmailedSelected.length} selected lead{alreadyEmailedSelected.length !== 1 ? 's have' : ' has'} already been emailed.
              </div>
            )}
            {exceedsLimit && (
              <div className="p-3 bg-[#f59e0b15] border border-[#f59e0b30] rounded-xl text-xs text-[#f59e0b]">
                ⚠ ~{Math.round(estimatedSeconds / 60)}min estimated — exceeds Vercel&apos;s 5-min function limit. Campaign may be cut short.
              </div>
            )}

            <div className="border border-[#30313e] rounded-xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-[#27283380]">
              {selectedLeads.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-3 py-2 text-xs bg-[#13141a]">
                  <span className="text-[#e8e5e0] font-medium">{l.business_name}</span>
                  <span className="font-mono text-[#8c909e]">{l.email}</span>
                </div>
              ))}
            </div>

            <div className="text-xs text-[#8c909e]">
              Delay: <span className="text-[#c5c2bc]">{delay}s between each send</span>
              {' · '}Est. <span className="text-[#c5c2bc]">{estimatedSeconds < 60 ? `${estimatedSeconds}s` : `${Math.round(estimatedSeconds / 60)}min`}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={startSend}
                className="flex-1 py-2.5 bg-[#7c6af5] text-white rounded-xl font-medium text-sm hover:bg-[#6d5ce6] transition-colors">
                Send now
              </button>
              <button onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm text-[#8c909e] hover:text-[#e8e5e0] transition-colors rounded-xl hover:bg-[#252630]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
