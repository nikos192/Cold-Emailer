export type LeadStatus = 'pending' | 'emailed' | 'skip'

export interface Lead {
  id: string
  name: string
  business_name: string
  suburb: string
  trade: string
  email: string
  status: LeadStatus
  emailed_at?: string
  created_at: string
  [key: string]: string | undefined
}

export interface Template {
  subject: string
  body: string
}

export interface CampaignResult {
  lead_id: string
  business_name: string
  email: string
  status: 'sent' | 'failed'
  error?: string
  timestamp: string
}

export interface Campaign {
  id: string
  started_at: string
  completed_at?: string
  status: 'running' | 'complete' | 'failed'
  total: number
  sent: number
  failed: number
  subject: string
  results: CampaignResult[]
}
