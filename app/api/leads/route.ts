import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import {
  getAllLeads,
  saveLead,
  addLeadToIndex,
} from '@/lib/kv'
import type { Lead } from '@/types'

export async function GET() {
  try {
    const leads = await getAllLeads()
    return NextResponse.json({ leads })
  } catch (err) {
    console.error('GET /api/leads', err)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

// POST: add single lead or import CSV array
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Bulk import: { leads: Lead[] }
    if (Array.isArray(body.leads)) {
      const imported: Lead[] = []
      for (const raw of body.leads) {
        const lead: Lead = {
          id: randomUUID(),
          name: raw.name ?? '',
          business_name: raw.business_name ?? raw['Business Name'] ?? raw['business name'] ?? '',
          suburb: raw.suburb ?? raw.Suburb ?? '',
          trade: raw.trade ?? raw.Trade ?? '',
          email: (raw.email ?? raw.Email ?? '').toLowerCase().trim(),
          status: 'pending',
          created_at: new Date().toISOString(),
        }
        // preserve extra metadata
        for (const [k, v] of Object.entries(raw)) {
          const norm = k.toLowerCase().replace(/\s+/g, '_')
          if (!['name', 'business_name', 'suburb', 'trade', 'email', 'status', 'id', 'created_at'].includes(norm)) {
            lead[norm] = String(v)
          }
        }
        await saveLead(lead)
        await addLeadToIndex(lead.id)
        imported.push(lead)
      }
      return NextResponse.json({ imported: imported.length, leads: imported })
    }

    // Single lead
    const lead: Lead = {
      id: randomUUID(),
      name: body.name ?? '',
      business_name: body.business_name ?? '',
      suburb: body.suburb ?? '',
      trade: body.trade ?? '',
      email: (body.email ?? '').toLowerCase().trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    if (!lead.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await saveLead(lead)
    await addLeadToIndex(lead.id)
    return NextResponse.json({ lead }, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads', err)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}
