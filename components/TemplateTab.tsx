'use client'

import { useState, useEffect, useRef } from 'react'
import type { Lead, Template } from '@/types'

const MERGE_VARS = [
  { label: '{{first_name}}',    desc: 'First word of contact name' },
  { label: '{{business_name}}', desc: 'Business name' },
  { label: '{{suburb}}',        desc: 'Suburb' },
  { label: '{{trade}}',         desc: 'Trade type' },
]

function mergePreview(text: string, lead: Lead | null): string {
  if (!lead) return text
  const firstName = (lead.name ?? '').split(' ')[0] ?? lead.name
  return text
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{business_name\}\}/g, lead.business_name)
    .replace(/\{\{suburb\}\}/g, lead.suburb)
    .replace(/\{\{trade\}\}/g, lead.trade)
}

export default function TemplateTab() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [previewLeadId, setPreviewLeadId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeInsert, setActiveInsert] = useState<'subject' | 'body'>('body')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const [tRes, lRes] = await Promise.all([fetch('/api/template'), fetch('/api/leads')])
      const tData = await tRes.json()
      const lData = await lRes.json()
      if (tData.template) { setSubject(tData.template.subject); setBody(tData.template.body) }
      if (lData.leads) { setLeads(lData.leads); if (lData.leads.length > 0) setPreviewLeadId(lData.leads[0].id) }
      setLoading(false)
    }
    load()
  }, [])

  const previewLead = leads.find((l) => l.id === previewLeadId) ?? null

  function insertVar(variable: string) {
    if (activeInsert === 'subject' && subjectRef.current) {
      const el = subjectRef.current
      const start = el.selectionStart ?? subject.length
      const end   = el.selectionEnd   ?? subject.length
      const newVal = subject.slice(0, start) + variable + subject.slice(end)
      setSubject(newVal)
      setTimeout(() => { el.focus(); el.setSelectionRange(start + variable.length, start + variable.length) }, 0)
    } else if (bodyRef.current) {
      const el = bodyRef.current
      const start = el.selectionStart ?? body.length
      const end   = el.selectionEnd   ?? body.length
      const newVal = body.slice(0, start) + variable + body.slice(end)
      setBody(newVal)
      setTimeout(() => { el.focus(); el.setSelectionRange(start + variable.length, start + variable.length) }, 0)
    }
  }

  async function saveTemplate() {
    setSaving(true)
    try {
      await fetch('/api/template', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, body }) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-12 text-[#8c909e]">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Loading template...
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#e8e5e0]">Email Template</h2>
          <button onClick={saveTemplate} disabled={saving}
            className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
              saved
                ? 'bg-[#34d39920] text-[#34d399] border border-[#34d39940]'
                : 'bg-[#7c6af5] text-white hover:bg-[#6d5ce6]'
            } disabled:opacity-40`}>
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save template'}
          </button>
        </div>

        {/* Merge vars */}
        <div className="bg-[#1d1e26] border border-[#30313e] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#8c909e] uppercase tracking-widest">Merge Variables</p>
            <div className="flex gap-1 text-xs bg-[#13141a] border border-[#30313e] rounded-lg p-0.5">
              <button onClick={() => setActiveInsert('subject')}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeInsert === 'subject' ? 'bg-[#7c6af5] text-white' : 'text-[#8c909e] hover:text-[#e8e5e0]'}`}>
                → Subject
              </button>
              <button onClick={() => setActiveInsert('body')}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeInsert === 'body' ? 'bg-[#7c6af5] text-white' : 'text-[#8c909e] hover:text-[#e8e5e0]'}`}>
                → Body
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_VARS.map((v) => (
              <button key={v.label} onClick={() => insertVar(v.label)} title={v.desc}
                className="font-mono text-xs px-2.5 py-1 bg-[#13141a] border border-[#30313e] rounded-md text-[#7c6af5] hover:border-[#7c6af5] hover:bg-[#7c6af510] transition-all">
                {v.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#4a4b5a]">
            Click a variable to insert at cursor. Target: <span className="text-[#8c909e]">{activeInsert}</span>
          </p>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8c909e] uppercase tracking-widest">Subject line</label>
          <input ref={subjectRef} type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setActiveInsert('subject')}
            className="w-full bg-[#1d1e26] border border-[#30313e] rounded-lg px-3 py-2.5 text-sm text-[#e8e5e0] focus:border-[#7c6af5] transition-colors font-mono" />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8c909e] uppercase tracking-widest">Body</label>
          <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)}
            onFocus={() => setActiveInsert('body')}
            rows={16}
            className="w-full bg-[#1d1e26] border border-[#30313e] rounded-lg px-3 py-2.5 text-sm text-[#e8e5e0] focus:border-[#7c6af5] transition-colors font-mono resize-y leading-relaxed" />
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-[#e8e5e0]">Live Preview</h2>
          <select value={previewLeadId} onChange={(e) => setPreviewLeadId(e.target.value)}
            className="ml-auto text-xs bg-[#1d1e26] border border-[#30313e] rounded-lg px-3 py-1.5 text-[#c5c2bc] focus:border-[#7c6af5] transition-colors max-w-[200px]">
            {leads.length === 0 && <option value="">No leads yet</option>}
            {leads.map((l) => <option key={l.id} value={l.id}>{l.business_name || l.email}</option>)}
          </select>
        </div>

        <div className="bg-[#1d1e26] border border-[#30313e] rounded-xl overflow-hidden">
          {/* Email header */}
          <div className="border-b border-[#30313e] px-4 py-3 space-y-2 bg-[#252630]">
            <div className="flex gap-2 items-baseline text-xs">
              <span className="text-[#8c909e] w-12 shrink-0">To</span>
              <span className="font-mono text-[#c5c2bc]">{previewLead?.email ?? '—'}</span>
            </div>
            <div className="flex gap-2 items-baseline text-xs">
              <span className="text-[#8c909e] w-12 shrink-0">Subject</span>
              <span className="text-[#e8e5e0] font-medium">{previewLead ? mergePreview(subject, previewLead) : subject || '—'}</span>
            </div>
          </div>
          {/* Email body */}
          <div className="px-4 py-4 min-h-[320px]">
            {previewLead ? (
              <pre className="text-sm text-[#c5c2bc] whitespace-pre-wrap leading-relaxed font-sans">
                {mergePreview(body, previewLead)}
              </pre>
            ) : (
              <p className="text-sm text-[#4a4b5a]">Add leads to see a live preview here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
