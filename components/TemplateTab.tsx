'use client'

import { useState, useEffect, useRef } from 'react'
import type { Lead, Template } from '@/types'

const MERGE_VARS = [
  { label: '{{first_name}}', desc: 'First word of contact name' },
  { label: '{{business_name}}', desc: 'Business name' },
  { label: '{{suburb}}', desc: 'Suburb' },
  { label: '{{trade}}', desc: 'Trade type' },
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
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const [tRes, lRes] = await Promise.all([
        fetch('/api/template'),
        fetch('/api/leads'),
      ])
      const tData = await tRes.json()
      const lData = await lRes.json()
      if (tData.template) {
        setSubject(tData.template.subject)
        setBody(tData.template.body)
      }
      if (lData.leads) {
        setLeads(lData.leads)
        if (lData.leads.length > 0) setPreviewLeadId(lData.leads[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  const previewLead = leads.find((l) => l.id === previewLeadId) ?? null

  function insertVar(variable: string, field: 'subject' | 'body') {
    if (field === 'subject' && subjectRef.current) {
      const el = subjectRef.current
      const start = el.selectionStart ?? subject.length
      const end = el.selectionEnd ?? subject.length
      const newVal = subject.slice(0, start) + variable + subject.slice(end)
      setSubject(newVal)
      setTimeout(() => {
        el.focus()
        el.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    } else if (field === 'body' && bodyRef.current) {
      const el = bodyRef.current
      const start = el.selectionStart ?? body.length
      const end = el.selectionEnd ?? body.length
      const newVal = body.slice(0, start) + variable + body.slice(end)
      setBody(newVal)
      setTimeout(() => {
        el.focus()
        el.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  async function saveTemplate() {
    setSaving(true)
    try {
      await fetch('/api/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-[#6b6b6b] py-8">Loading template...</div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Editor side */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#f0ede8]">Email Template</h2>
          <button
            onClick={saveTemplate}
            disabled={saving}
            className="text-xs px-3 py-1.5 bg-[#f0ede8] text-[#0a0a0a] rounded font-medium hover:bg-[#d4c9b8] transition-colors disabled:opacity-40"
          >
            {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save template'}
          </button>
        </div>

        {/* Merge var chips */}
        <div>
          <p className="text-xs text-[#6b6b6b] mb-2">Merge variables — click to insert at cursor:</p>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_VARS.map((v) => (
              <div key={v.label} className="flex gap-1">
                <button
                  onClick={() => insertVar(v.label, 'subject')}
                  className="font-mono text-xs px-2 py-0.5 bg-[#111111] border border-[#1e1e1e] rounded text-[#d4c9b8] hover:border-[#3a3a3a] transition-colors"
                  title={`Insert into subject: ${v.desc}`}
                >
                  {v.label}↑
                </button>
                <button
                  onClick={() => insertVar(v.label, 'body')}
                  className="font-mono text-xs px-2 py-0.5 bg-[#111111] border border-[#1e1e1e] rounded text-[#d4c9b8] hover:border-[#3a3a3a] transition-colors"
                  title={`Insert into body: ${v.desc}`}
                >
                  {v.label}↓
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#3a3a3a] mt-1">↑ = insert to subject, ↓ = insert to body</p>
        </div>

        {/* Subject */}
        <div className="space-y-1">
          <label className="text-xs text-[#6b6b6b] uppercase tracking-wider">Subject</label>
          <input
            ref={subjectRef}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-[#111111] border border-[#1e1e1e] rounded px-3 py-2 text-sm text-[#f0ede8] focus:border-[#3a3a3a] transition-colors font-mono"
          />
        </div>

        {/* Body */}
        <div className="space-y-1">
          <label className="text-xs text-[#6b6b6b] uppercase tracking-wider">Body</label>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="w-full bg-[#111111] border border-[#1e1e1e] rounded px-3 py-2 text-sm text-[#f0ede8] focus:border-[#3a3a3a] transition-colors font-mono resize-y leading-relaxed"
          />
        </div>
      </div>

      {/* Preview side */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-[#f0ede8]">Live Preview</h2>
          <select
            value={previewLeadId}
            onChange={(e) => setPreviewLeadId(e.target.value)}
            className="ml-auto text-xs bg-[#111111] border border-[#1e1e1e] rounded px-2 py-1 text-[#f0ede8] focus:border-[#3a3a3a] transition-colors max-w-[200px]"
          >
            {leads.length === 0 && <option value="">No leads yet</option>}
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.business_name || l.email}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#111111] border border-[#1e1e1e] rounded p-4 space-y-3 min-h-[400px]">
          {previewLead ? (
            <>
              <div className="space-y-1 pb-3 border-b border-[#1e1e1e]">
                <div className="flex gap-2 text-xs">
                  <span className="text-[#6b6b6b]">To:</span>
                  <span className="font-mono text-[#d4c9b8]">{previewLead.email}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-[#6b6b6b]">Subject:</span>
                  <span className="text-[#f0ede8]">{mergePreview(subject, previewLead)}</span>
                </div>
              </div>
              <pre className="text-sm text-[#a0a0a0] whitespace-pre-wrap leading-relaxed font-sans">
                {mergePreview(body, previewLead)}
              </pre>
            </>
          ) : (
            <p className="text-xs text-[#6b6b6b]">Add leads to preview the email.</p>
          )}
        </div>
      </div>
    </div>
  )
}
