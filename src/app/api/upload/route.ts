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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mimeType = file.type || 'image/png'
    const base64Image = `data:${mimeType};base64,${buffer.toString('base64')}`

    await prisma.visualLayer.update({
      where: { id: layerId },
      data: { imagePath: base64Image },
    })

    return NextResponse.json({ imagePath: base64Image })
  } catch (error: unknown) {
    const err = error as Error
    console.error('[API /api/upload POST Error]:', err)
    return NextResponse.json({ error: err?.message || 'Failed to upload image' }, { status: 500 })
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
  } catch (error: unknown) {
    const err = error as Error
    console.error('[API /api/upload DELETE Error]:', err)
    return NextResponse.json({ error: err?.message || 'Failed to delete image' }, { status: 500 })
  }
}
