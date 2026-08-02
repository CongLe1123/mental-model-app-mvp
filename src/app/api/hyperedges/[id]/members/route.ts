import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const hyperedgeId = (await params).id
  const { nodeId, isOutcome } = await req.json()
  if (!hyperedgeId || !nodeId) {
    return NextResponse.json({ error: 'hyperedgeId, nodeId required' }, { status: 400 })
  }
  const member = await prisma.hyperedgeMember.create({
    data: { hyperedgeId, nodeId, isOutcome: isOutcome || false },
    include: { node: true },
  })
  return NextResponse.json(member, { status: 201 })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('id')
  if (!memberId) return NextResponse.json({ error: 'member id required' }, { status: 400 })
  await prisma.hyperedgeMember.delete({ where: { id: memberId } })
  return NextResponse.json({ ok: true })
}
