import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params
  const { nodeId, order, explanation } = await req.json()
  if (!pathId || !nodeId) {
    return NextResponse.json({ error: 'pathId, nodeId required' }, { status: 400 })
  }
  const step = await prisma.reasoningPathStep.create({
    data: { pathId, nodeId, order: order ?? 0, explanation: explanation || '' },
    include: { node: true },
  })
  return NextResponse.json(step, { status: 201 })
}

export async function PATCH(req: Request) {
  const { stepId, explanation } = await req.json()
  if (!stepId) return NextResponse.json({ error: 'stepId required' }, { status: 400 })
  const updated = await prisma.reasoningPathStep.update({
    where: { id: stepId },
    data: { explanation: explanation ?? '' },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const stepId = searchParams.get('id')
  if (!stepId) return NextResponse.json({ error: 'step id required' }, { status: 400 })
  await prisma.reasoningPathStep.delete({ where: { id: stepId } })
  return NextResponse.json({ ok: true })
}


