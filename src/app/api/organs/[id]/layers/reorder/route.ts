import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: organId } = await params
  const { layerIds } = await req.json() as { layerIds: string[] }

  if (!Array.isArray(layerIds)) {
    return NextResponse.json({ error: 'layerIds must be an array' }, { status: 400 })
  }

  // Update layer orders in a transaction
  await prisma.$transaction(
    layerIds.map((layerId, index) =>
      prisma.visualLayer.update({
        where: { id: layerId, organId },
        data: { order: index },
      })
    )
  )

  const updatedLayers = await prisma.visualLayer.findMany({
    where: { organId },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json(updatedLayers)
}
