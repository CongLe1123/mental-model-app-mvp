import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: organId } = await params
  const { layerId, name } = await req.json()
  if (!layerId) return NextResponse.json({ error: 'layerId required' }, { status: 400 })

  const source = await prisma.visualLayer.findUnique({
    where: { id: layerId },
    include: { annotations: { include: { node: true } }, conceptNodes: true },
  })
  if (!source) return NextResponse.json({ error: 'Source layer not found' }, { status: 404 })

  const maxOrder = await prisma.visualLayer.aggregate({
    where: { organId },
    _max: { order: true },
  })
  const nextOrder = (maxOrder._max.order ?? -1) + 1

  // Use transaction for atomic clone
  const result = await prisma.$transaction(async (tx) => {
    const newLayer = await tx.visualLayer.create({
      data: {
        organId,
        name: name || `${source.name} (Copy)`,
        order: nextOrder,
        visible: true,
        opacity: 1.0,
        imagePath: source.imagePath,
        alignX: source.alignX,
        alignY: source.alignY,
        alignScale: source.alignScale,
        description: source.description,
      },
    })

    // Clone nodes first
    const nodeIdMap = new Map<string, string>()
    for (const node of source.conceptNodes) {
      const newNode = await tx.conceptNode.create({
        data: {
          organId,
          layerId: newLayer.id,
          title: node.title,
          canonicalName: node.canonicalName,
          category: node.category,
          aliases: node.aliases,
          shortDefinition: node.shortDefinition,
          detailedExplanation: node.detailedExplanation,
          tags: node.tags,
          authoringStatus: node.authoringStatus,
          generalInfo: node.generalInfo,
          anatomicalLocation: node.anatomicalLocation,
          editorComment: node.editorComment,
          suggestedTrails: node.suggestedTrails,
        },
      })
      nodeIdMap.set(node.id, newNode.id)
    }

    // Clone annotations
    for (const ann of source.annotations) {
      const newNodeId = nodeIdMap.get(ann.nodeId)
      if (newNodeId) {
        await tx.annotation.create({
          data: {
            layerId: newLayer.id,
            nodeId: newNodeId,
            type: ann.type,
            x: ann.x,
            y: ann.y,
            width: ann.width,
            height: ann.height,
          },
        })
      }
    }

    // Clone relationships within this layer, remapping node IDs
    const internalRelationships = await tx.relationship.findMany({
      where: {
        organId,
        sourceNodeId: { in: source.conceptNodes.map(n => n.id) },
        targetNodeId: { in: source.conceptNodes.map(n => n.id) },
      },
    })
    for (const rel of internalRelationships) {
      const newSourceId = nodeIdMap.get(rel.sourceNodeId)
      const newTargetId = nodeIdMap.get(rel.targetNodeId)
      if (newSourceId && newTargetId) {
        await tx.relationship.create({
          data: {
            organId,
            sourceNodeId: newSourceId,
            targetNodeId: newTargetId,
            type: rel.type,
            lens: rel.lens,
            label: rel.label,
            explanation: rel.explanation,
          },
        })
      }
    }

    return tx.visualLayer.findUnique({
      where: { id: newLayer.id },
      include: { annotations: true, conceptNodes: true },
    })
  })

  return NextResponse.json(result, { status: 201 })
}
