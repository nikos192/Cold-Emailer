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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', business_name: '', suburb: '', trade: '', email: '',
  })

  async function loadLeads() {
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      setLeads(data.leads ?? [])
    } catch {
      console.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLeads() }, [])

  // Derived filter values
  const suburbs = [...new Set(leads.map((l) => l.suburb).filter(Boolean))].sort()
  const trades = [...new Set(leads.map((l) => l.trade).filter(Boolean))].sort()

  const filtered = leads.filter((l) => {
    if (filterSuburb && l.suburb !== filterSuburb) return false
    if (filterTrade && l.trade !== filterTrade) return false
    if (filterStatus && l.status !== filterStatus) return false
    return true
  })

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() { setSelected(new Set(filtered.map((l) => l.id))) }
  function deselectAll() { setSelected(new Set()) }

  async function patchLead(id: string, patch: Partial<Lead>) {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l))
  }

  async function deleteLead(id: string) {
    await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    setLeads((prev) => prev.filter((l) => l.id !== id))
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  async function bulkDelete() {
    for (const id of selected) await deleteLead(id)
    setSelected(new Set())
  }

  async function bulkSkip() {
    for (const id of selected) await patchLead(id, { status: 'skip' })
    setSelected(new Set())
  }

  async function handleAddLead() {
    if (!form.email) return
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.lead) {
        setLeads((prev) => [data.lead, ...prev])
        setForm({ name: '', business_name: '', suburb: '', trade: '', email: '' })
        setShowAddForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleImportCSV() {
    if (!csvText.trim()) return
    setCsvError('')
    setImporting(true)
    try {
      const rows = parseCSV(csvText)
      if (rows.length === 0) { setCsvError('No valid rows found.'); return }
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: rows }),
      })
      const data = await res.json()
      if (data.leads) {
        setLeads((prev) => [...data.leads, ...prev])
        setCsvText('')
      }
    } catch {
      setCsvError('Failed to import.')
    } finally {
      setImporting(false)
    }
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target?.result as string)
    reader.readAsText(file)
  }

  if (loading) {
    return <div className="text-sm text-[#6b6b6b] py-8">Loading leads...</div>
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-[#f0ede8]">Leads</h2>
          <p className="text-xs text-[#6b6b6b] mt-0.5">{leads.length} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="text-xs px-3 py-1.5 bg-[#111111] border border-[#1e1e1e] rounded hover:border-[#3a3a3a] transition-colors"
          >
            + Add lead
          </button>
        </div>
      </div>

      {/* Add Lead Form */}
      {showAddForm && (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded p-4 space-y-3">
          <p className="text-xs font-medium text-[#a0a0a0] uppercase tracking-wider">Add Single Lead</p>
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
                className="bg-[#0a0a0a] border border-[#1e1e1e] rounded px-3 py-2 text-sm text-[#f0ede8] placeholder-[#3a3a3a] focus:border-[#3a3a3a] transition-colors"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddLead}
              disabled={saving || !form.email}
              className="text-xs px-3 py-1.5 bg-[#f0ede8] text-[#0a0a0a] rounded font-medium hover:bg-[#d4c9b8] transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Add Lead'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-xs px-3 py-1.5 text-[#6b6b6b] hover:text-[#f0ede8] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CSV Import */}
      <div className="bg-[#111111] border border-[#1e1e1e] rounded p-4 space-y-3">
        <p className="text-xs font-medium text-[#a0a0a0] uppercase tracking-wider">Import CSV</p>
        <p className="text-xs text-[#6b6b6b]">Expected columns: name, business_name, suburb, trade, email (case-insensitive)</p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={'name,business_name,suburb,trade,email\nJohn Smith,Smiths Plumbing,Surfers Paradise,Plumber,john@example.com'}
          rows={4}
          className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#f0ede8] placeholder-[#2a2a2a] focus:border-[#3a3a3a] transition-colors resize-y"
        />
        {csvError && <p className="text-red-400 text-xs">{csvError}</p>}
        <div className="flex gap-2 items-center">
          <button
            onClick={handleImportCSV}
            disabled={importing || !csvText.trim()}
            className="text-xs px-3 py-1.5 bg-[#f0ede8] text-[#0a0a0a] rounded font-medium hover:bg-[#d4c9b8] transition-colors disabled:opacity-40"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
          <span className="text-[#3a3a3a] text-xs">or</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 bg-[#111111] border border-[#1e1e1e] rounded hover:border-[#3a3a3a] transition-colors"
          >
            Upload .csv
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filterSuburb}
          onChange={(e) => setFilterSuburb(e.target.value)}
          className="text-xs bg-[#111111] border border-[#1e1e1e] rounded px-2 py-1.5 text-[#f0ede8] focus:border-[#3a3a3a] transition-colors"
        >
          <option value="">All suburbs</option>
          {suburbs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterTrade}
          onChange={(e) => setFilterTrade(e.target.value)}
          className="text-xs bg-[#111111] border border-[#1e1e1e] rounded px-2 py-1.5 text-[#f0ede8] focus:border-[#3a3a3a] transition-colors"
        >
          <option value="">All trades</option>
          {trades.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LeadStatus | '')}
          className="text-xs bg-[#111111] border border-[#1e1e1e] rounded px-2 py-1.5 text-[#f0ede8] focus:border-[#3a3a3a] transition-colors"
        >
          <option value="">All statuses</option>
          <option value="pending">Not contacted</option>
          <option value="emailed">Emailed</option>
          <option value="skip">Skip</option>
        </select>
        {(filterSuburb || filterTrade || filterStatus) && (
          <button
            onClick={() => { setFilterSuburb(''); setFilterTrade(''); setFilterStatus('') }}
            className="text-xs text-[#6b6b6b] hover:text-[#f0ede8] transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex gap-2 items-center p-2 bg-[#111111] border border-[#1e1e1e] rounded">
          <span className="text-xs text-[#6b6b6b]">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <button onClick={selectAll} className="text-xs px-2 py-1 text-[#6b6b6b] hover:text-[#f0ede8] transition-colors">Select all</button>
            <button onClick={deselectAll} className="text-xs px-2 py-1 text-[#6b6b6b] hover:text-[#f0ede8] transition-colors">Deselect all</button>
            <button onClick={bulkSkip} className="text-xs px-3 py-1 bg-[#2a1800] text-[#f59e0b] rounded hover:bg-[#3a2200] transition-colors">Mark skip</button>
            <button onClick={bulkDelete} className="text-xs px-3 py-1 bg-[#1a0000] text-red-400 rounded hover:bg-[#2a0000] transition-colors">Delete</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-[#1e1e1e] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e1e1e] bg-[#0d0d0d]">
                <th className="w-8 px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((l) => selected.has(l.id))}
                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                    className="accent-[#f0ede8]"
                  />
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-[#6b6b6b] uppercase tracking-wider">Business</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#6b6b6b] uppercase tracking-wider">Suburb</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#6b6b6b] uppercase tracking-wider">Trade</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#6b6b6b] uppercase tracking-wider">Email</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#6b6b6b] uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 text-left font-medium text-[#6b6b6b] uppercase tracking-wider">Added</th>
                <th className="px-3 py-2.5 text-right font-medium text-[#6b6b6b] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[#6b6b6b]">
                    No leads found.
                  </td>
                </tr>
              ) : (
                filtered.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-[#1e1e1e] hover:bg-[#0d0d0d] transition-colors ${
                      selected.has(lead.id) ? 'bg-[#111111]' : ''
                    } ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="accent-[#f0ede8]"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-[#f0ede8] font-medium">{lead.business_name || '—'}</td>
                    <td className="px-3 py-2.5 text-[#a0a0a0]">{lead.suburb || '—'}</td>
                    <td className="px-3 py-2.5 text-[#a0a0a0]">{lead.trade || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[#6b6b6b]">{lead.email}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={lead.status} /></td>
                    <td className="px-3 py-2.5 text-[#6b6b6b]">
                      {new Date(lead.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex gap-2 justify-end">
                        {lead.status !== 'skip' && (
                          <button
                            onClick={() => patchLead(lead.id, { status: 'skip' })}
                            className="text-[#6b6b6b] hover:text-[#f59e0b] transition-colors"
                            title="Mark as skip"
                          >
                            Skip
                          </button>
                        )}
                        {lead.status === 'skip' && (
                          <button
                            onClick={() => patchLead(lead.id, { status: 'pending' })}
                            className="text-[#6b6b6b] hover:text-[#f0ede8] transition-colors"
                          >
                            Restore
                          </button>
                        )}
                        <button
                          onClick={() => deleteLead(lead.id)}
                          className="text-[#6b6b6b] hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
