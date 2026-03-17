import { NextResponse } from 'next/server'
import { getActiveCampaign } from '@/lib/kv'

export async function GET() {
  try {
    const campaign = await getActiveCampaign()
    return NextResponse.json({ campaign })
  } catch (err) {
    console.error('GET /api/campaigns/active', err)
    return NextResponse.json({ error: 'Failed to fetch active campaign' }, { status: 500 })
  }
}
