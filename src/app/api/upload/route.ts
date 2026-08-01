import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const layerId = formData.get('layerId') as string | null
  if (!file || !layerId) {
    return NextResponse.json({ error: 'file and layerId required' }, { status: 400 })
  }

  // Validate format
  const ext = path.extname(file.name).toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) {
    return NextResponse.json({ error: 'Unsupported format. Use PNG, JPG, WEBP, or SVG' }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })

  const filename = `${layerId}-${Date.now()}${ext}`
  const filepath = path.join(uploadDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filepath, buffer)

  const imagePath = `/uploads/${filename}`

  // Remove old image if exists
  const layer = await prisma.visualLayer.findUnique({ where: { id: layerId } })
  if (layer?.imagePath) {
    const oldPath = path.join(process.cwd(), 'public', layer.imagePath)
    try { await writeFile(oldPath, Buffer.from('')) } catch {}
  }

  await prisma.visualLayer.update({
    where: { id: layerId },
    data: { imagePath },
  })

  return NextResponse.json({ imagePath })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const layerId = searchParams.get('layerId')
  if (!layerId) return NextResponse.json({ error: 'layerId required' }, { status: 400 })

  const layer = await prisma.visualLayer.findUnique({ where: { id: layerId } })
  if (!layer) return NextResponse.json({ error: 'Layer not found' }, { status: 404 })

  await prisma.visualLayer.update({
    where: { id: layerId },
    data: { imagePath: '' },
  })

  return NextResponse.json({ ok: true })
}
