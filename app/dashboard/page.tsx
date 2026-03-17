'use client'

import { useState } from 'react'
import LeadsTab from '@/components/LeadsTab'
import TemplateTab from '@/components/TemplateTab'
import SendTab from '@/components/SendTab'
import HistoryTab from '@/components/HistoryTab'

type Tab = 'leads' | 'template' | 'send' | 'history'

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'leads', label: 'Leads', icon: '👥' },
  { id: 'template', label: 'Template', icon: '✉️' },
  { id: 'send', label: 'Send', icon: '🚀' },
  { id: 'history', label: 'History', icon: '📋' },
]

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('leads')

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#13141a] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#30313e] bg-[#1d1e26]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#7c6af5] flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 3h8M2 6h5M2 9h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight text-[#e8e5e0]">
              Velory Outreach
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-[#8c909e] hover:text-[#e8e5e0] transition-colors px-3 py-1.5 rounded-md hover:bg-[#252630]"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="border-b border-[#30313e] bg-[#1d1e26]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#7c6af5] text-[#e8e5e0]'
                  : 'border-transparent text-[#8c909e] hover:text-[#c5c2bc] hover:bg-[#25263080]'
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7">
        {activeTab === 'leads' && <LeadsTab />}
        {activeTab === 'template' && <TemplateTab />}
        {activeTab === 'send' && <SendTab />}
        {activeTab === 'history' && <HistoryTab />}
      </main>
    </div>
  )
}
