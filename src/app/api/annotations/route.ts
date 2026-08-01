import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const organId = searchParams.get('organId')
  if (!organId) return NextResponse.json({ error: 'organId required' }, { status: 400 })
  const annotations = await prisma.annotation.findMany({
    where: { layer: { organId } },
    include: { node: true },
  })
  return NextResponse.json(annotations)
}

export async function POST(req: Request) {
  const { layerId, nodeId, type, x, y, width, height } = await req.json()
  if (!layerId || !nodeId || !type) {
    return NextResponse.json({ error: 'layerId, nodeId, type required' }, { status: 400 })
  }
  const ann = await prisma.annotation.create({
    data: { layerId, nodeId, type, x: x ?? 0, y: y ?? 0, width: width ?? 0, height: height ?? 0 },
  })
  return NextResponse.json(ann, { status: 201 })
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data = await req.json()
  const ann = await prisma.annotation.update({ where: { id }, data })
  return NextResponse.json(ann)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.annotation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
