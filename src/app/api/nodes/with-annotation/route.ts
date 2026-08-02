import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const { node, annotation } = await req.json()
  if (!node?.organId || !node?.layerId || !node?.title?.trim()) {
    return NextResponse.json({ error: 'organId, layerId, title required in node' }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const newNode = await tx.conceptNode.create({
      data: {
        organId: node.organId,
        layerId: node.layerId,
        title: node.title.trim(),
        canonicalName: node.canonicalName || '',
        category: node.category || '',
        aliases: node.aliases || '',
        shortDefinition: node.shortDefinition || '',
        tags: node.tags || '',
        authoringStatus: node.authoringStatus || 'draft',
        generalInfo: node.generalInfo || '',
        anatomicalLocation: node.anatomicalLocation || '',
        editorComment: node.editorComment || '',
        suggestedTrails: node.suggestedTrails || '',
      },
    })
    const ann = await tx.annotation.create({
      data: {
        layerId: newNode.layerId,
        nodeId: newNode.id,
        type: annotation.type || 'PIN',
        x: annotation.x ?? 0,
        y: annotation.y ?? 0,
        width: annotation.width ?? 0,
        height: annotation.height ?? 0,
      },
    })
    return { node: newNode, annotation: ann }
  })

  return NextResponse.json(result, { status: 201 })
}
