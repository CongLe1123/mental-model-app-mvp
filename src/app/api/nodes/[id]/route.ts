import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const node = await prisma.conceptNode.findUnique({
    where: { id },
    include: {
      annotations: true,
      outgoingRelations: { include: { target: true } },
      incomingRelations: { include: { source: true } },
    },
  })
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const layer = await prisma.visualLayer.findUnique({ where: { id: node.layerId } })
  return NextResponse.json({ ...node, layerName: layer?.name })
}
