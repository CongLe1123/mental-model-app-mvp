import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; layerId: string }> }) {
  const { layerId } = await params
  const data = await req.json()
  const layer = await prisma.visualLayer.update({ where: { id: layerId }, data })
  return NextResponse.json(layer)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; layerId: string }> }) {
  const { layerId } = await params
  await prisma.visualLayer.delete({ where: { id: layerId } })
  return NextResponse.json({ ok: true })
}
