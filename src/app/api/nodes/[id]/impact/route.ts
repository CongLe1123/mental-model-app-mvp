import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [relCount, , , stepCount, hyperedgeCount] = await Promise.all([
    prisma.relationship.count({ where: { OR: [{ sourceNodeId: id }, { targetNodeId: id }] } }),
    prisma.relationship.count({ where: { targetNodeId: id } }),
    prisma.relationship.count({ where: { sourceNodeId: id } }),
    prisma.reasoningPathStep.count({ where: { nodeId: id } }),
    prisma.hyperedgeMember.count({ where: { nodeId: id } }),
  ])
  const crossLayer =
    (await prisma.relationship.findMany({
      where: {
        OR: [{ sourceNodeId: id }, { targetNodeId: id }],
      },
      include: {
        source: { select: { layerId: true } },
        target: { select: { layerId: true } },
      },
    })).filter(r => r.source.layerId !== r.target.layerId).length

  const pathIds = (await prisma.reasoningPathStep.findMany({
    where: { nodeId: id },
    select: { pathId: true },
  })).map(s => s.pathId)
  const uniquePaths = new Set(pathIds).size

  const hyperedgeIds = (await prisma.hyperedgeMember.findMany({
    where: { nodeId: id },
    select: { hyperedgeId: true },
  })).map(h => h.hyperedgeId)
  const uniqueHyperedges = new Set(hyperedgeIds).size

  return NextResponse.json({
    relationships: relCount,
    crossLayerRelationships: crossLayer,
    reasoningPathSteps: stepCount,
    reasoningPaths: uniquePaths,
    hyperedgeMembers: hyperedgeCount,
    hyperedges: uniqueHyperedges,
    evidence: 0,
  })
}
