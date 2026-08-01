import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const { organId, layerId, title, shortDefinition, tags, authoringStatus, generalInfo } = await req.json()
  if (!organId || !layerId || !title?.trim()) {
    return NextResponse.json({ error: 'organId, layerId, title required' }, { status: 400 })
  }
  const node = await prisma.conceptNode.create({
    data: {
      organId,
      layerId,
      title: title.trim(),
      shortDefinition: shortDefinition || '',
      tags: tags || '',
      authoringStatus: authoringStatus || 'draft',
      generalInfo: generalInfo || '',
    },
  })
  return NextResponse.json(node, { status: 201 })
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data = await req.json()
  const node = await prisma.conceptNode.update({ where: { id }, data })
  return NextResponse.json(node)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.conceptNode.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
