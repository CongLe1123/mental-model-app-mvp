import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const organ = await prisma.organ.findUnique({
    where: { id },
    include: {
      visualLayers: {
        orderBy: { order: 'asc' },
        include: { annotations: true },
      },
      conceptNodes: true,
      relationships: true,
      reasoningPaths: {
        include: {
          steps: { orderBy: { order: 'asc' } },
        },
      },
      hyperedges: {
        include: { members: true },
      },
    },
  })

  if (!organ) {
    return NextResponse.json({ error: 'Organ not found' }, { status: 404 })
  }

  // Fetch evidence for this organ's paths & hyperedges
  const pathIds = organ.reasoningPaths.map(p => p.id)
  const hyperedgeIds = organ.hyperedges.map(h => h.id)

  const evidence = await prisma.evidence.findMany({
    where: {
      OR: [
        { targetType: 'REASONING_PATH', targetId: { in: pathIds } },
        { targetType: 'HYPEREDGE', targetId: { in: hyperedgeIds } },
      ],
    },
  })

  // Format clean export payload
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    organ: {
      name: organ.name,
      description: organ.description || '',
      thumbnail: organ.thumbnail || '',
    },
    layers: organ.visualLayers.map(l => ({
      id: l.id,
      name: l.name,
      description: l.description || '',
      order: l.order,
      visible: l.visible,
      opacity: l.opacity,
      locked: l.locked,
      imagePath: l.imagePath || '',
      alignX: l.alignX || 0,
      alignY: l.alignY || 0,
      alignScale: l.alignScale || 1,
    })),
    nodes: organ.conceptNodes.map(n => ({
      id: n.id,
      layerId: n.layerId,
      title: n.title,
      canonicalName: n.canonicalName || '',
      category: n.category || '',
      aliases: n.aliases || '',
      shortDefinition: n.shortDefinition || '',
      detailedExplanation: n.detailedExplanation || '',
      tags: n.tags || '',
      authoringStatus: n.authoringStatus || 'draft',
      generalInfo: n.generalInfo || '',
      anatomicalLocation: n.anatomicalLocation || '',
      editorComment: n.editorComment || '',
      suggestedTrails: n.suggestedTrails || '',
    })),
    annotations: organ.visualLayers.flatMap(l =>
      l.annotations.map(a => ({
        id: a.id,
        layerId: a.layerId,
        nodeId: a.nodeId,
        type: a.type,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
      }))
    ),
    relationships: organ.relationships.map(r => ({
      id: r.id,
      sourceNodeId: r.sourceNodeId,
      targetNodeId: r.targetNodeId,
      type: r.type,
      lens: r.lens,
      label: r.label || '',
      explanation: r.explanation || '',
    })),
    reasoningPaths: organ.reasoningPaths.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      guidingQuestion: p.guidingQuestion || '',
      steps: p.steps.map(s => ({
        id: s.id,
        nodeId: s.nodeId,
        order: s.order,
        explanation: s.explanation || '',
      })),
    })),
    hyperedges: organ.hyperedges.map(h => ({
      id: h.id,
      name: h.name,
      type: h.type || '',
      description: h.description || '',
      members: h.members.map(m => ({
        id: m.id,
        nodeId: m.nodeId,
        isOutcome: m.isOutcome,
      })),
    })),
    evidence: evidence.map(e => ({
      id: e.id,
      targetType: e.targetType,
      targetId: e.targetId,
      sourceTitle: e.sourceTitle,
      url: e.url || '',
      notes: e.notes || '',
      confidence: e.confidence || 'Medium',
      confidenceExplanation: e.confidenceExplanation || '',
    })),
  }

  return NextResponse.json(exportData)
}
