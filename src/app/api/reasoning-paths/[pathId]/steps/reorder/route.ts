import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(req: Request, _context: { params: Promise<{ pathId: string }> }) {
  const { stepIds } = await req.json()
  if (!Array.isArray(stepIds)) {
    return NextResponse.json({ error: 'stepIds array required' }, { status: 400 })
  }
  await prisma.$transaction(
    stepIds.map((id: string, index: number) =>
      prisma.reasoningPathStep.update({ where: { id }, data: { order: index } })
    )
  )
  return NextResponse.json({ ok: true })
}
