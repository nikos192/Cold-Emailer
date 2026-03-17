import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAllLeads, saveLead, addLeadToIndex } from '@/lib/kv'
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

/**
 * Normalise a raw CSV row into a Lead.
 *
 * Supports two formats:
 *  1. Standard:  name | business_name | suburb | trade | email
 *  2. Scraper:   Name | Category | Website Status | Website | Phone |
 *                Address | City | Rating | Reviews | Distance | Google Maps
 *
 * In the scraper format "Name" is the business name (no contact name).
 */
function normaliseRow(raw: Record<string, string>): Lead {
  const k = (key: string) => raw[key] ?? raw[key.toLowerCase()] ?? raw[key.toUpperCase()] ?? ''

  // Detect scraper format by presence of "Category" or "Website Status" column
  const isScraperFormat = 'category' in raw || 'website status' in raw || 'website_status' in raw

  let business_name: string
  let name: string
  let suburb: string
  let trade: string
  let email: string

  if (isScraperFormat) {
    business_name = k('Name') || k('name')
    name          = ''   // no contact name in scraper export
    suburb        = k('City') || k('city') || ''
    trade         = k('Category') || k('category') || ''
    email         = (k('Email') || k('email') || '').toLowerCase().trim()
  } else {
    name          = k('name')
    business_name = k('business_name') || k('Business Name') || k('business name')
    suburb        = k('suburb') || k('Suburb')
    trade         = k('trade') || k('Trade')
    email         = (k('email') || k('Email') || '').toLowerCase().trim()
  }

  const lead: Lead = {
    id:            randomUUID(),
    name,
    business_name,
    suburb,
    trade,
    email,
    status:        'pending',
    created_at:    new Date().toISOString(),
  }

  // Preserve all extra columns as metadata (phone, address, rating, etc.)
  const coreKeys = new Set(['name', 'business_name', 'suburb', 'trade', 'email',
                             'status', 'id', 'created_at', 'emailed_at'])
  for (const [k, v] of Object.entries(raw)) {
    const norm = k.toLowerCase().replace(/[\s-]+/g, '_')
    if (!coreKeys.has(norm) && v) lead[norm] = String(v)
  }

  return lead
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Bulk import: { leads: Record[] }
    if (Array.isArray(body.leads)) {
      const imported: Lead[] = []
      for (const raw of body.leads) {
        const lead = normaliseRow(raw)
        await saveLead(lead)
        await addLeadToIndex(lead.id)
        imported.push(lead)
      }
      return NextResponse.json({ imported: imported.length, leads: imported })
    }

    // Single lead (manual form — email optional)
    const lead: Lead = {
      id:            randomUUID(),
      name:          body.name ?? '',
      business_name: body.business_name ?? '',
      suburb:        body.suburb ?? '',
      trade:         body.trade ?? '',
      email:         (body.email ?? '').toLowerCase().trim(),
      status:        'pending',
      created_at:    new Date().toISOString(),
    }

    if (body.phone) lead.phone = body.phone

    await saveLead(lead)
    await addLeadToIndex(lead.id)
    return NextResponse.json({ lead }, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads', err)
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 })
  }
}
