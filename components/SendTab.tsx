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
    // Check if there's an active campaign already running
    checkActive()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkActive() {
    const res = await fetch('/api/campaigns/active')
    const data = await res.json()
    if (data.campaign) {
      setActiveCampaign(data.campaign)
      setSending(true)
      startPolling()
    }
  }

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const res = await fetch('/api/campaigns/active')
      const data = await res.json()
      if (data.campaign) {
        setActiveCampaign(data.campaign)
      } else {
        // Campaign finished
        stopPolling()
        setSending(false)
        setDone(true)
        loadLeads()
      }
    }, 2000)
  }, [stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  const pendingLeads = leads.filter((l) => l.status === 'pending')
  const emailedLeads = leads.filter((l) => l.status === 'emailed')
  const skipLeads = leads.filter((l) => l.status === 'skip')
  const selectedLeads = leads.filter((l) => selected.has(l.id))
  const alreadyEmailedSelected = selectedLeads.filter((l) => l.status === 'emailed')

  const estimatedSeconds = selectedLeads.length > 1 ? (selectedLeads.length - 1) * delay : 0
  const exceedsLimit = estimatedSeconds > MAX_VERCEL_SECONDS

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectPending() {
    setSelected(new Set(pendingLeads.map((l) => l.id)))
  }

  async function startSend() {
    setShowModal(false)
    setSending(true)
    setDone(false)
    setActiveCampaign(null)
    startPolling()

    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: [...selected], delay }),
      })
    } catch (err) {
      console.error('Send error:', err)
    }

    // The polling will detect campaign completion
  }

  if (loading) return <div className="text-sm text-[#6b6b6b] py-8">Loading...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-medium text-[#f0ede8]">Send Campaign</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total leads', value: leads.length },
          { label: 'Not contacted', value: pendingLeads.length },
          { label: 'Already emailed', value: emailedLeads.length },
          { label: 'Skipped', value: skipLeads.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#111111] border border-[#1e1e1e] rounded p-3">
            <div className="text-lg font-mono text-[#f0ede8]">{value}</div>
            <div className="text-xs text-[#6b6b6b] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Lead selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#6b6b6b]">Select leads to send to:</p>
          <div className="flex gap-2">
            <button onClick={selectPending} className="text-xs px-2 py-1 text-[#6b6b6b] hover:text-[#f0ede8] transition-colors">
              Select not-contacted ({pendingLeads.length})
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs px-2 py-1 text-[#6b6b6b] hover:text-[#f0ede8] transition-colors">
              Clear
            </button>
          </div>
        </div>
        <div className="border border-[#1e1e1e] rounded overflow-hidden max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <tbody>
              {leads.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-[#6b6b6b]">No leads yet. Import some in the Leads tab.</td></tr>
              ) : leads.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => toggleSelect(lead.id)}
                  className={`border-b border-[#1e1e1e] cursor-pointer transition-colors hover:bg-[#0d0d0d] ${
                    selected.has(lead.id) ? 'bg-[#111111]' : ''
                  } ${i === leads.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => {}} className="accent-[#f0ede8]" />
                  </td>
                  <td className="px-3 py-2 text-[#f0ede8] font-medium">{lead.business_name}</td>
                  <td className="px-3 py-2 text-[#6b6b6b] font-mono">{lead.email}</td>
                  <td className="px-3 py-2"><StatusBadge status={lead.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delay slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-[#6b6b6b] uppercase tracking-wider">Delay between emails</label>
          <span className="text-sm font-mono text-[#f0ede8]">{delay}s</span>
        </div>
        <input
          type="range"
          min={15}
          max={120}
          step={5}
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value))}
          className="w-full accent-[#f0ede8]"
        />
        <div className="flex justify-between text-xs text-[#3a3a3a]">
          <span>15s</span>
          <span>120s</span>
        </div>
        {exceedsLimit && (
          <div className="p-3 bg-[#2a1800] border border-[#3a2200] rounded text-xs text-[#f59e0b]">
            ⚠ Warning: {selectedLeads.length} leads × {delay}s delay = ~{Math.round(estimatedSeconds / 60)}min. This exceeds Vercel&apos;s 5-minute function timeout. Reduce the number of leads or the delay, or the campaign will be cut off early.
          </div>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={selected.size === 0 || sending}
        className="px-5 py-2.5 bg-[#f0ede8] text-[#0a0a0a] rounded font-medium text-sm hover:bg-[#d4c9b8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {sending ? 'Sending...' : `Send to ${selected.size} lead${selected.size !== 1 ? 's' : ''}`}
      </button>

      {/* Real-time log */}
      {(sending || done) && (
        <div className="border border-[#1e1e1e] rounded overflow-hidden">
          <div className="bg-[#0d0d0d] px-3 py-2 border-b border-[#1e1e1e] flex items-center justify-between">
            <span className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wider">Send Log</span>
            {activeCampaign && sending && (
              <span className="text-xs text-[#6b6b6b] font-mono">
                Sending {activeCampaign.results.length} of {activeCampaign.total}...
              </span>
            )}
            {done && activeCampaign && (
              <span className="text-xs text-[#3ecf8e] font-mono">
                Complete — {activeCampaign.sent} sent, {activeCampaign.failed} failed
              </span>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto p-3 space-y-1 bg-[#080808]">
            {activeCampaign?.results.length === 0 && sending && (
              <p className="text-xs text-[#3a3a3a] font-mono">Preparing to send...</p>
            )}
            {activeCampaign?.results.map((r, i) => (
              <div key={i} className="font-mono text-xs">
                {r.status === 'sent' ? (
                  <span className="text-[#3ecf8e]">✓ Sent → {r.business_name} ({r.email})</span>
                ) : (
                  <span className="text-red-400">✗ Failed → {r.business_name} — {r.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-lg w-full max-w-md mx-4 p-5 space-y-4">
            <h3 className="text-sm font-medium text-[#f0ede8]">Confirm Campaign</h3>

            {alreadyEmailedSelected.length > 0 && (
              <div className="p-3 bg-[#2a1800] border border-[#3a2200] rounded text-xs text-[#f59e0b]">
                ⚠ {alreadyEmailedSelected.length} selected lead(s) have already been emailed.
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs text-[#6b6b6b]">{selectedLeads.length} email(s) will be sent:</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {selectedLeads.map((l) => (
                  <div key={l.id} className="text-xs flex justify-between">
                    <span className="text-[#f0ede8]">{l.business_name}</span>
                    <span className="font-mono text-[#6b6b6b]">{l.email}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-[#6b6b6b]">
              Estimated time: ~{estimatedSeconds < 60 ? `${estimatedSeconds}s` : `${Math.round(estimatedSeconds / 60)}min`} at {delay}s delay
            </div>

            {exceedsLimit && (
              <div className="text-xs text-[#f59e0b]">⚠ Exceeds 5-min Vercel limit — campaign may be cut short.</div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={startSend}
                className="flex-1 py-2 bg-[#f0ede8] text-[#0a0a0a] rounded font-medium text-sm hover:bg-[#d4c9b8] transition-colors"
              >
                Send
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-[#6b6b6b] hover:text-[#f0ede8] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
