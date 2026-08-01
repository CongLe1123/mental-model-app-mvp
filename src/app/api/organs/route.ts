import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const organs = await prisma.organ.findMany({ orderBy: { updatedAt: 'desc' } })
  return NextResponse.json(organs)
}

export async function POST(req: Request) {
  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const organ = await prisma.organ.create({ data: { name: name.trim(), description: description || '' } })
  return NextResponse.json(organ, { status: 201 })
}
