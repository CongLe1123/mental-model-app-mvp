import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const layerId = formData.get('layerId') as string | null

    if (!file || !layerId) {
      return NextResponse.json({ error: 'file and layerId required' }, { status: 400 })
    }

    // Validate format
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const validExts = ['png', 'jpg', 'jpeg', 'webp', 'svg']
    if (!validExts.includes(ext)) {
      return NextResponse.json({ error: 'Unsupported format. Use PNG, JPG, WEBP, or SVG' }, { status: 400 })
    }

    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }
    const mimeType = file.type || mimeTypes[ext] || 'image/png'

    // Convert file to Base64 Data URL (compatible with Vercel serverless environment)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = `data:${mimeType};base64,${buffer.toString('base64')}`

    await prisma.visualLayer.update({
      where: { id: layerId },
      data: { imagePath: base64Image },
    })

    return NextResponse.json({ imagePath: base64Image })
  } catch (error: any) {
    console.error('[API /api/upload POST Error]:', error)
    return NextResponse.json({ error: error?.message || 'Failed to upload image' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const layerId = searchParams.get('layerId')
    if (!layerId) return NextResponse.json({ error: 'layerId required' }, { status: 400 })

    await prisma.visualLayer.update({
      where: { id: layerId },
      data: { imagePath: '' },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[API /api/upload DELETE Error]:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete image' }, { status: 500 })
  }
}

