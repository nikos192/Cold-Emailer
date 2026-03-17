import { NextResponse } from 'next/server'
import { getAllCampaigns } from '@/lib/kv'

export async function GET() {
  try {
    const campaigns = await getAllCampaigns()
    return NextResponse.json({ campaigns })
  } catch (err) {
    console.error('GET /api/campaigns', err)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}
