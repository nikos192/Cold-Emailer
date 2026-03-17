import { NextResponse } from 'next/server'
import { getTemplate, saveTemplate } from '@/lib/kv'

export async function GET() {
  try {
    const template = await getTemplate()
    return NextResponse.json({ template })
  } catch (err) {
    console.error('GET /api/template', err)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { subject, body } = await request.json()
    if (!subject || !body) {
      return NextResponse.json({ error: 'Subject and body required' }, { status: 400 })
    }
    await saveTemplate({ subject, body })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/template', err)
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 })
  }
}
