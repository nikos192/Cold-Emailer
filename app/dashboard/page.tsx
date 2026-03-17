'use client'

import { useState } from 'react'
import LeadsTab from '@/components/LeadsTab'
import TemplateTab from '@/components/TemplateTab'
import SendTab from '@/components/SendTab'
import HistoryTab from '@/components/HistoryTab'

type Tab = 'leads' | 'template' | 'send' | 'history'

const tabs: { id: Tab; label: string }[] = [
  { id: 'leads', label: 'Leads' },
  { id: 'template', label: 'Template' },
  { id: 'send', label: 'Send' },
  { id: 'history', label: 'History' },
]

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('leads')

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1e1e1e] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-12">
          <span className="font-mono text-sm tracking-tight text-[#f0ede8]">
            VELORY OUTREACH
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-[#6b6b6b] hover:text-[#f0ede8] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="border-b border-[#1e1e1e] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#f0ede8] text-[#f0ede8]'
                  : 'border-transparent text-[#6b6b6b] hover:text-[#a0a0a0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'leads' && <LeadsTab />}
        {activeTab === 'template' && <TemplateTab />}
        {activeTab === 'send' && <SendTab />}
        {activeTab === 'history' && <HistoryTab />}
      </main>
    </div>
  )
}
