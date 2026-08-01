import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const organ = await prisma.organ.findUnique({
    where: { id },
    include: {
      visualLayers: { orderBy: { order: 'asc' } },
      conceptNodes: true,
      relationships: {
        include: { source: true, target: true },
      },
      reasoningPaths: {
        include: {
          steps: { orderBy: { order: 'asc' }, include: { node: true } },
        },
      },
      hyperedges: {
        include: { members: { include: { node: true } } },
      },
    },
  })
  if (!organ) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(organ)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, description } = await req.json()
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description
  const organ = await prisma.organ.update({ where: { id }, data })
  return NextResponse.json(organ)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.organ.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
