import { NextResponse } from 'next/server'
import { getLead, saveLead, deleteLead } from '@/lib/kv'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteLead(params.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/leads/[id]', err)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await getLead(params.id)
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    const body = await request.json()
    const updated = { ...lead, ...body }
    await saveLead(updated)
    return NextResponse.json({ lead: updated })
  } catch (err) {
    console.error('PATCH /api/leads/[id]', err)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
