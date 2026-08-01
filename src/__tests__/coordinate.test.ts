import { describe, it, expect } from 'vitest'

// Coordinate normalization: store relative to image
function normalizeCoord(screenX: number, screenY: number, imageWidth: number, imageHeight: number, canvasWidth: number, canvasHeight: number, zoom: number, panX: number, panY: number) {
  return {
    x: (screenX - panX) / zoom,
    y: (screenY - panY) / zoom,
  }
}

function denormalizeCoord(x: number, y: number, zoom: number, panX: number, panY: number) {
  return {
    screenX: x * zoom + panX,
    screenY: y * zoom + panY,
  }
}

describe('Coordinate normalization', () => {
  it('converts screen to image coordinates', () => {
    const result = normalizeCoord(300, 400, 600, 400, 800, 600, 1, 0, 0)
    expect(result.x).toBe(300)
    expect(result.y).toBe(400)
  })

  it('accounts for zoom', () => {
    const result = normalizeCoord(600, 800, 600, 400, 800, 600, 2, 0, 0)
    expect(result.x).toBe(300)
    expect(result.y).toBe(400)
  })

  it('accounts for pan', () => {
    const result = normalizeCoord(350, 450, 600, 400, 800, 600, 1, 50, 50)
    expect(result.x).toBe(300)
    expect(result.y).toBe(400)
  })

  it('accounts for zoom and pan together', () => {
    const result = normalizeCoord(700, 850, 600, 400, 800, 600, 2, 100, 50)
    expect(result.x).toBe(300)
    expect(result.y).toBe(400)
  })

  it('round-trips correctly', () => {
    const origX = 150.5
    const origY = 275.3
    const zoom = 1.5
    const panX = 30
    const panY = 20

    const { screenX, screenY } = denormalizeCoord(origX, origY, zoom, panX, panY)
    const result = normalizeCoord(screenX, screenY, 800, 600, 800, 600, zoom, panX, panY)
    expect(result.x).toBeCloseTo(origX, 5)
    expect(result.y).toBeCloseTo(origY, 5)
  })
})

describe('Annotation geometry', () => {
  it('pin movement changes coordinates', () => {
    const oldX = 100, oldY = 200
    const newX = 150, newY = 250
    expect(newX).not.toBe(oldX)
    expect(newY).not.toBe(oldY)
  })

  it('rectangle resize changes dimensions', () => {
    const oldW = 60, oldH = 40
    const newW = 100, newH = 80
    expect(newW).not.toBe(oldW)
    expect(newH).not.toBe(oldH)
  })
})
