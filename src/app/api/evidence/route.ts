import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const organId = searchParams.get('organId')
  if (!organId) return NextResponse.json({ error: 'organId required' }, { status: 400 })
  const evidence = await prisma.evidence.findMany({
    where: {
      OR: [
        { targetId: { in: (await prisma.reasoningPath.findMany({ where: { organId }, select: { id: true } })).map(p => p.id) } },
        { targetId: { in: (await prisma.hyperedge.findMany({ where: { organId }, select: { id: true } })).map(h => h.id) } },
      ],
    },
  })
  return NextResponse.json(evidence)
}

export async function POST(req: Request) {
  const { targetType, targetId, sourceTitle, url, notes, confidence, confidenceExplanation } = await req.json()
  if (!targetType || !targetId || !sourceTitle?.trim()) {
    return NextResponse.json({ error: 'targetType, targetId, sourceTitle required' }, { status: 400 })
  }
  const ev = await prisma.evidence.create({
    data: {
      targetType,
      targetId,
      sourceTitle: sourceTitle.trim(),
      url: url || '',
      notes: notes || '',
      confidence: confidence || 'Medium',
      confidenceExplanation: confidenceExplanation || '',
    },
  })
  return NextResponse.json(ev, { status: 201 })
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data = await req.json()
  const ev = await prisma.evidence.update({ where: { id }, data })
  return NextResponse.json(ev)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.evidence.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
