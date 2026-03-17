import { kv } from '@vercel/kv'
import type { Lead, Template, Campaign } from '@/types'

// ─── Leads ───────────────────────────────────────────────────────────────────

export async function getLead(id: string): Promise<Lead | null> {
  return kv.get<Lead>(`lead:${id}`)
}

export async function saveLead(lead: Lead): Promise<void> {
  await kv.set(`lead:${lead.id}`, lead)
}

export async function deleteLead(id: string): Promise<void> {
  await kv.del(`lead:${id}`)
  const index = await getLeadIndex()
  const updated = index.filter((lid) => lid !== id)
  await kv.set('leads:index', updated)
}

export async function getLeadIndex(): Promise<string[]> {
  const index = await kv.get<string[]>('leads:index')
  return index ?? []
}

export async function addLeadToIndex(id: string): Promise<void> {
  const index = await getLeadIndex()
  if (!index.includes(id)) {
    await kv.set('leads:index', [...index, id])
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  const index = await getLeadIndex()
  if (index.length === 0) return []
  const keys = index.map((id) => `lead:${id}`)
  // mget for efficiency
  const leads = await kv.mget<Lead[]>(...keys)
  return leads.filter((l): l is Lead => l !== null)
}

// ─── Template ─────────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATE: Template = {
  subject: 'Quick question for {{business_name}}',
  body: `Hi {{first_name}},

I was searching for {{trade}} businesses in {{suburb}} and noticed {{business_name}} doesn't have a website yet.

I run Velory — a Gold Coast web design agency that specialises in local tradies. I build clean, fast websites that get you found on Google, usually live within 5–7 days.

Happy to send over some examples of similar sites I've built if you're keen — no pressure at all.

Cheers,
Nikos
Velory Web Design
velory.com.au`,
}

export async function getTemplate(): Promise<Template> {
  const t = await kv.get<Template>('template:active')
  return t ?? DEFAULT_TEMPLATE
}

export async function saveTemplate(template: Template): Promise<void> {
  await kv.set('template:active', template)
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

export async function getCampaignIndex(): Promise<string[]> {
  const index = await kv.get<string[]>('campaigns:index')
  return index ?? []
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  return kv.get<Campaign>(`campaign:${id}`)
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  await kv.set(`campaign:${campaign.id}`, campaign)
}

export async function addCampaignToIndex(id: string): Promise<void> {
  const index = await getCampaignIndex()
  await kv.set('campaigns:index', [id, ...index])
}

export async function getActiveCampaign(): Promise<Campaign | null> {
  return kv.get<Campaign>('campaign:active')
}

export async function setActiveCampaign(campaign: Campaign): Promise<void> {
  await kv.set('campaign:active', campaign)
}

export async function clearActiveCampaign(): Promise<void> {
  await kv.del('campaign:active')
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  const index = await getCampaignIndex()
  if (index.length === 0) return []
  const campaigns: Campaign[] = []
  for (const id of index) {
    const c = await getCampaign(id)
    if (c) campaigns.push(c)
  }
  return campaigns
}

// ─── Merge ────────────────────────────────────────────────────────────────────

export function mergeTemplate(template: string, lead: Lead): string {
  const firstName = (lead.name ?? '').split(' ')[0] ?? lead.name
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{business_name\}\}/g, lead.business_name)
    .replace(/\{\{suburb\}\}/g, lead.suburb)
    .replace(/\{\{trade\}\}/g, lead.trade)
}
