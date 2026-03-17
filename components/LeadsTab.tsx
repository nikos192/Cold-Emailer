'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'
import StatusBadge from './StatusBadge'
import type { Lead, LeadStatus } from '@/types'

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })
}

export default function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterSuburb, setFilterSuburb] = useState('')
  const [filterTrade, setFilterTrade] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatus | ''>('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvError, setCsvError] = useState('')
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCSV, setShowCSV] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ name: '', business_name: '', suburb: '', trade: '', email: '' })

  async function loadLeads() {
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      setLeads(data.leads ?? [])
    } catch { console.error('Failed to load leads') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadLeads() }, [])

  const suburbs = [...new Set(leads.map((l) => l.suburb).filter(Boolean))].sort()
  const trades  = [...new Set(leads.map((l) => l.trade).filter(Boolean))].sort()

  const filtered = leads.filter((l) => {
    if (filterSuburb && l.suburb !== filterSuburb) return false
    if (filterTrade  && l.trade  !== filterTrade)  return false
    if (filterStatus && l.status !== filterStatus) return false
    return true
  })

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll() { setSelected(new Set(filtered.map((l) => l.id))) }
  function deselectAll() { setSelected(new Set()) }

  async function patchLead(id: string, patch: Partial<Lead>) {
    await fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l))
  }

  async function deleteLead(id: string) {
    await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  async function bulkDelete() { for (const id of selected) await deleteLead(id); setSelected(new Set()) }
  async function bulkSkip()   { for (const id of selected) await patchLead(id, { status: 'skip' }); setSelected(new Set()) }

  async function handleAddLead() {
    if (!form.email) return
    setSaving(true)
    try {
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (data.lead) { setLeads((prev) => [data.lead, ...prev]); setForm({ name: '', business_name: '', suburb: '', trade: '', email: '' }); setShowAddForm(false) }
    } finally { setSaving(false) }
  }

  async function handleImportCSV() {
    if (!csvText.trim()) return
    setCsvError('')
    setImporting(true)
    try {
      const rows = parseCSV(csvText)
      if (rows.length === 0) { setCsvError('No valid rows found.'); return }
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leads: rows }) })
      const data = await res.json()
      if (data.leads) { setLeads((prev) => [...data.leads, ...prev]); setCsvText('') }
    } catch { setCsvError('Failed to import.') }
    finally { setImporting(false) }
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target?.result as string)
    reader.readAsText(file)
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-12 text-[#8c909e]">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Loading leads...
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#e8e5e0]">Leads</h2>
          <p className="text-xs text-[#8c909e] mt-0.5">
            {leads.length} total · {leads.filter(l => l.status === 'pending').length} not contacted
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCSV((v) => !v); setShowAddForm(false) }}
            className="text-xs px-3 py-1.5 bg-[#1d1e26] border border-[#30313e] rounded-lg hover:border-[#7c6af5] hover:text-[#e8e5e0] text-[#8c909e] transition-all"
          >
            Import CSV
          </button>
          <button
            onClick={() => { setShowAddForm((v) => !v); setShowCSV(false) }}
            className="text-xs px-3 py-1.5 bg-[#7c6af5] text-white rounded-lg hover:bg-[#6d5ce6] transition-colors font-medium"
          >
            + Add lead
          </button>
        </div>
      </div>

      {/* Add Lead Form */}
      {showAddForm && (
        <div className="bg-[#1d1e26] border border-[#30313e] rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-[#8c909e] uppercase tracking-widest">Add Single Lead</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { key: 'business_name', label: 'Business Name' },
              { key: 'name', label: 'Contact Name' },
              { key: 'suburb', label: 'Suburb' },
              { key: 'trade', label: 'Trade' },
              { key: 'email', label: 'Email' },
            ].map(({ key, label }) => (
              <input
                key={key}
                placeholder={label}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="bg-[#13141a] border border-[#30313e] rounded-lg px-3 py-2 text-sm text-[#e8e5e0] placeholder-[#4a4b5a] focus:border-[#7c6af5] transition-colors"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddLead} disabled={saving || !form.email}
              className="text-xs px-4 py-2 bg-[#7c6af5] text-white rounded-lg font-medium hover:bg-[#6d5ce6] transition-colors disabled:opacity-40">
              {saving ? 'Saving...' : 'Add Lead'}
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="text-xs px-4 py-2 text-[#8c909e] hover:text-[#e8e5e0] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CSV Import */}
      {showCSV && (
        <div className="bg-[#1d1e26] border border-[#30313e] rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-[#8c909e] uppercase tracking-widest">Import CSV</p>
          <p className="text-xs text-[#8c909e]">Expected columns: <span className="font-mono text-[#c5c2bc]">name, business_name, suburb, trade, email</span></p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'name,business_name,suburb,trade,email\nJohn Smith,Smiths Plumbing,Surfers Paradise,Plumber,john@example.com'}
            rows={4}
            className="w-full bg-[#13141a] border border-[#30313e] rounded-lg px-3 py-2 text-xs font-mono text-[#e8e5e0] placeholder-[#30313e] focus:border-[#7c6af5] transition-colors resize-y"
          />
          {csvError && <p className="text-[#f87171] text-xs">{csvError}</p>}
          <div className="flex gap-2 items-center">
            <button onClick={handleImportCSV} disabled={importing || !csvText.trim()}
              className="text-xs px-4 py-2 bg-[#7c6af5] text-white rounded-lg font-medium hover:bg-[#6d5ce6] transition-colors disabled:opacity-40">
              {importing ? 'Importing...' : 'Import'}
            </button>
            <span className="text-[#30313e] text-xs">or</span>
            <button onClick={() => fileInputRef.current?.click()}
              className="text-xs px-3 py-2 bg-[#13141a] border border-[#30313e] rounded-lg hover:border-[#7c6af5] text-[#8c909e] transition-all">
              Upload .csv
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterSuburb} onChange={(e) => setFilterSuburb(e.target.value)}
          className="text-xs bg-[#1d1e26] border border-[#30313e] rounded-lg px-3 py-1.5 text-[#c5c2bc] focus:border-[#7c6af5] transition-colors">
          <option value="">All suburbs</option>
          {suburbs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterTrade} onChange={(e) => setFilterTrade(e.target.value)}
          className="text-xs bg-[#1d1e26] border border-[#30313e] rounded-lg px-3 py-1.5 text-[#c5c2bc] focus:border-[#7c6af5] transition-colors">
          <option value="">All trades</option>
          {trades.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as LeadStatus | '')}
          className="text-xs bg-[#1d1e26] border border-[#30313e] rounded-lg px-3 py-1.5 text-[#c5c2bc] focus:border-[#7c6af5] transition-colors">
          <option value="">All statuses</option>
          <option value="pending">Not contacted</option>
          <option value="emailed">Emailed</option>
          <option value="skip">Skip</option>
        </select>
        {(filterSuburb || filterTrade || filterStatus) && (
          <button onClick={() => { setFilterSuburb(''); setFilterTrade(''); setFilterStatus('') }}
            className="text-xs text-[#8c909e] hover:text-[#e8e5e0] transition-colors px-2 py-1 rounded hover:bg-[#252630]">
            × Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-[#8c909e]">{filtered.length} shown</span>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex gap-2 items-center p-3 bg-[#7c6af510] border border-[#7c6af530] rounded-xl">
          <span className="text-xs text-[#c5c2bc] font-medium">{selected.size} selected</span>
          <div className="ml-auto flex gap-1.5">
            <button onClick={selectAll}  className="text-xs px-2.5 py-1 text-[#8c909e] hover:text-[#e8e5e0] transition-colors rounded-md hover:bg-[#252630]">Select all</button>
            <button onClick={deselectAll} className="text-xs px-2.5 py-1 text-[#8c909e] hover:text-[#e8e5e0] transition-colors rounded-md hover:bg-[#252630]">Deselect all</button>
            <button onClick={bulkSkip}   className="text-xs px-3 py-1 bg-[#f59e0b18] text-[#f59e0b] border border-[#f59e0b40] rounded-md hover:bg-[#f59e0b28] transition-colors">Mark skip</button>
            <button onClick={bulkDelete} className="text-xs px-3 py-1 bg-[#f8717118] text-[#f87171] border border-[#f8717140] rounded-md hover:bg-[#f8717128] transition-colors">Delete</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-[#30313e] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#30313e] bg-[#1d1e26]">
                <th className="w-10 px-4 py-3 text-left">
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every((l) => selected.has(l.id))}
                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                    className="accent-[#7c6af5] w-3.5 h-3.5" />
                </th>
                {['Business', 'Suburb', 'Trade', 'Email', 'Status', 'Added', ''].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-[#8c909e] uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27283380]">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#8c909e]">No leads found.</td></tr>
              ) : filtered.map((lead) => (
                <tr key={lead.id}
                  className={`hover:bg-[#1d1e26] transition-colors ${selected.has(lead.id) ? 'bg-[#7c6af508]' : 'bg-[#13141a]'}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)}
                      className="accent-[#7c6af5] w-3.5 h-3.5" />
                  </td>
                  <td className="px-3 py-3 text-sm text-[#e8e5e0] font-medium whitespace-nowrap">{lead.business_name || '—'}</td>
                  <td className="px-3 py-3 text-sm text-[#8c909e] whitespace-nowrap">{lead.suburb || '—'}</td>
                  <td className="px-3 py-3 text-sm text-[#8c909e] whitespace-nowrap">{lead.trade || '—'}</td>
                  <td className="px-3 py-3 text-xs font-mono text-[#8c909e] whitespace-nowrap">{lead.email}</td>
                  <td className="px-3 py-3 whitespace-nowrap"><StatusBadge status={lead.status} /></td>
                  <td className="px-3 py-3 text-xs text-[#8c909e] whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <div className="flex gap-1 justify-end">
                      {lead.status !== 'skip' ? (
                        <button onClick={() => patchLead(lead.id, { status: 'skip' })}
                          className="text-xs px-2.5 py-1 text-[#8c909e] hover:text-[#f59e0b] hover:bg-[#f59e0b15] rounded-md transition-colors">
                          Skip
                        </button>
                      ) : (
                        <button onClick={() => patchLead(lead.id, { status: 'pending' })}
                          className="text-xs px-2.5 py-1 text-[#8c909e] hover:text-[#e8e5e0] hover:bg-[#252630] rounded-md transition-colors">
                          Restore
                        </button>
                      )}
                      <button onClick={() => deleteLead(lead.id)}
                        className="text-xs px-2.5 py-1 text-[#8c909e] hover:text-[#f87171] hover:bg-[#f8717115] rounded-md transition-colors">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
