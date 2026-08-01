import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: organId } = await params
  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const maxOrder = await prisma.visualLayer.aggregate({
    where: { organId },
    _max: { order: true },
  })
  const nextOrder = (maxOrder._max.order ?? -1) + 1

  const layer = await prisma.visualLayer.create({
    data: {
      organId,
      name: name.trim(),
      description: description || '',
      order: nextOrder,
    },
  })
  return NextResponse.json(layer, { status: 201 })
}
