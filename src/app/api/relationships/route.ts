import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const { organId, sourceNodeId, targetNodeId, type, lens, label, explanation } = await req.json()
  if (!organId || !sourceNodeId || !targetNodeId || !type) {
    return NextResponse.json({ error: 'organId, sourceNodeId, targetNodeId, type required' }, { status: 400 })
  }
  // Validate nodes exist
  const [source, target] = await Promise.all([
    prisma.conceptNode.findUnique({ where: { id: sourceNodeId } }),
    prisma.conceptNode.findUnique({ where: { id: targetNodeId } }),
  ])
  if (!source || !target) {
    return NextResponse.json({ error: 'Source or target node not found' }, { status: 400 })
  }
  // Compute lens from type
  const hierarchyTypes = ['PART_OF', 'CONTAINS', 'ADJACENT_TO']
  const routeTypes = ['FLOWS_TO', 'DRAINS_TO', 'SUPPLIES', 'INNERVATES']
  const mechanismTypes = ['CAUSES', 'LEADS_TO', 'RESULTS_IN', 'PREVENTS', 'MECHANISM_OF', 'EXPLAINS']
  let computedLens = lens || 'HIERARCHY'
  if (!lens) {
    if (hierarchyTypes.includes(type)) computedLens = 'HIERARCHY'
    else if (routeTypes.includes(type)) computedLens = 'ROUTE'
    else if (mechanismTypes.includes(type)) computedLens = 'MECHANISM_FUNCTION'
    else computedLens = 'STATE'
  }
  // Check duplicate
  const existing = await prisma.relationship.findFirst({
    where: { organId, sourceNodeId, targetNodeId, type },
  })
  if (existing) {
    return NextResponse.json({ error: 'Duplicate relationship exists' }, { status: 409 })
  }
  const rel = await prisma.relationship.create({
    data: { organId, sourceNodeId, targetNodeId, type, lens: computedLens, label: label || '', explanation: explanation || '' },
  })
  return NextResponse.json(rel, { status: 201 })
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data = await req.json()
  const rel = await prisma.relationship.update({ where: { id }, data })
  return NextResponse.json(rel)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.relationship.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
