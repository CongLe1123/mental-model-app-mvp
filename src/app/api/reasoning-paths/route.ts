import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const { organId, name, description, guidingQuestion } = await req.json()
  if (!organId || !name?.trim()) {
    return NextResponse.json({ error: 'organId, name required' }, { status: 400 })
  }
  const path = await prisma.reasoningPath.create({
    data: { organId, name: name.trim(), description: description || '', guidingQuestion: guidingQuestion || '' },
    include: { steps: { orderBy: { order: 'asc' }, include: { node: true } } },
  })
  return NextResponse.json(path, { status: 201 })
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const data = await req.json()
  const path = await prisma.reasoningPath.update({
    where: { id },
    data,
    include: { steps: { orderBy: { order: 'asc' }, include: { node: true } } },
  })
  return NextResponse.json(path)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.reasoningPath.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
