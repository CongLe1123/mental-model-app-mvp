import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const { organId, name, type, description } = await req.json()
  if (!organId || !name?.trim()) {
    return NextResponse.json({ error: 'organId, name required' }, { status: 400 })
  }
  const he = await prisma.hyperedge.create({
    data: { organId, name: name.trim(), type: type || '', description: description || '' },
    include: { members: { include: { node: true } } },
  })
  return NextResponse.json(he, { status: 201 })
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data = await req.json()
  const he = await prisma.hyperedge.update({
    where: { id },
    data,
    include: { members: { include: { node: true } } },
  })
  return NextResponse.json(he)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.hyperedge.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
