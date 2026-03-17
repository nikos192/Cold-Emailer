import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import {
  getLead,
  getTemplate,
  saveLead,
  saveCampaign,
  addCampaignToIndex,
  setActiveCampaign,
  clearActiveCampaign,
  mergeTemplate,
} from '@/lib/kv'
import { sendEmail } from '@/lib/mailer'
import type { Campaign, CampaignResult } from '@/types'

export const maxDuration = 300

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  try {
    const { leadIds, delay = 45 } = await request.json()

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array required' }, { status: 400 })
    }

    const delayMs = Math.min(Math.max(Number(delay) * 1000, 15000), 120000)

    const template = await getTemplate()
    const campaignId = randomUUID()
    const campaign: Campaign = {
      id: campaignId,
      started_at: new Date().toISOString(),
      status: 'running',
      total: leadIds.length,
      sent: 0,
      failed: 0,
      subject: template.subject,
      results: [],
    }

    await setActiveCampaign(campaign)
    await saveCampaign(campaign)
    await addCampaignToIndex(campaignId)

    // Process leads sequentially
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i]
      const lead = await getLead(leadId)

      if (!lead) {
        const result: CampaignResult = {
          lead_id: leadId,
          business_name: 'Unknown',
          email: '',
          status: 'failed',
          error: 'Lead not found',
          timestamp: new Date().toISOString(),
        }
        campaign.results.push(result)
        campaign.failed++
        await setActiveCampaign(campaign)
        await saveCampaign(campaign)
        continue
      }

      const subject = mergeTemplate(template.subject, lead)
      const body = mergeTemplate(template.body, lead)

      let result: CampaignResult
      try {
        await sendEmail({ to: lead.email, subject, text: body })
        result = {
          lead_id: lead.id,
          business_name: lead.business_name,
          email: lead.email,
          status: 'sent',
          timestamp: new Date().toISOString(),
        }
        campaign.sent++
        // Update lead status
        await saveLead({ ...lead, status: 'emailed', emailed_at: result.timestamp })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        result = {
          lead_id: lead.id,
          business_name: lead.business_name,
          email: lead.email,
          status: 'failed',
          error: errMsg,
          timestamp: new Date().toISOString(),
        }
        campaign.failed++
      }

      campaign.results.push(result)
      await setActiveCampaign(campaign)
      await saveCampaign(campaign)

      // Delay between sends (skip after last)
      if (i < leadIds.length - 1) {
        await sleep(delayMs)
      }
    }

    // Mark complete
    campaign.status = 'complete'
    campaign.completed_at = new Date().toISOString()
    await saveCampaign(campaign)
    await clearActiveCampaign()

    return NextResponse.json({
      campaignId,
      sent: campaign.sent,
      failed: campaign.failed,
      total: campaign.total,
    })
  } catch (err) {
    console.error('POST /api/send', err)
    await clearActiveCampaign()
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
