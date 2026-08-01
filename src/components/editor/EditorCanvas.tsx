'use client'

import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

export default function EditorCanvas() {
  const {
    layers, activeLayerId, activeTool, setActiveTool, nodes, annotations,
    selectedAnnotationId, selectedAnnotationIds, setSelectedAnnotationId, setSelectedAnnotationIds,
    selectedNodeId, setSelectedNodeId,
    createNodeWithAnnotation, updateAnnotation, deleteAnnotation, deleteNode, updateLayer,
    currentOrganId,
  } = useStore()

  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  // Canvas Modes & Drag States
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  // Marquee Selection state
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null)
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Object Dragging state (multi & single)
  const [isDraggingObjects, setIsDraggingObjects] = useState(false)
  const [dragCanvasStart, setDragCanvasStart] = useState<{ x: number; y: number } | null>(null)
  const [initialAnnPositions, setInitialAnnPositions] = useState<Record<string, { x: number; y: number }>>({})

  // Active Layer Image Drag state
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [imageDragStart, setImageDragStart] = useState<{ x: number; y: number; initAlignX: number; initAlignY: number } | null>(null)

  // Node Creation state
  const [newPinPos, setNewPinPos] = useState<{ x: number; y: number } | null>(null)
  const [newRect, setNewRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [showNodeForm, setShowNodeForm] = useState(false)
  const [nodeTitle, setNodeTitle] = useState('')

  // Resizing state
  const [resizingAnn, setResizingAnn] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const activeLayer = layers.find(l => l.id === activeLayerId)
  const visibleLayers = [...layers].filter(l => l.visible).sort((a, b) => a.order - b.order)

  // Helper to calculate canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent | MouseEvent, container: HTMLDivElement) => {
    const box = container.getBoundingClientRect()
    return {
      x: (e.clientX - box.left - panX) / zoom,
      y: (e.clientY - box.top - panY) / zoom,
    }
  }

  const containerRef = useRef<HTMLDivElement>(null)

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (activeTool === 'pan' || isPanning || isDraggingObjects || isDraggingImage) return
    if (!activeLayerId || !currentOrganId) return

    if (!containerRef.current) return
    const { x, y } = getCanvasCoords(e, containerRef.current)

    if (activeTool === 'pin') {
      setNewPinPos({ x, y })
      setShowNodeForm(true)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const coords = getCanvasCoords(e, containerRef.current)

    // Pan canvas with middle mouse or Pan tool
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
      e.preventDefault()
      return
    }

    // Rectangle creation tool
    if (activeTool === 'rectangle' && e.button === 0) {
      setRectStart(coords)
      setNewRect({ x: coords.x, y: coords.y, w: 0, h: 0 })
      return
    }

    // Select Tool canvas background behavior
    if (activeTool === 'select' && e.button === 0) {
      // Clear selection if clicking empty canvas (without shift)
      if (!e.shiftKey) {
        setSelectedAnnotationIds([])
        setSelectedNodeId(null)
      }
      // Start Marquee Selection Box
      setMarqueeStart(coords)
      setMarqueeRect({ x: coords.x, y: coords.y, w: 0, h: 0 })
    }
  }

  const handleObjectMouseDown = (annId: string, e: React.MouseEvent) => {
    if (activeTool !== 'select' || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    if (!containerRef.current) return
    const coords = getCanvasCoords(e, containerRef.current)

    let newSelection = [...selectedAnnotationIds]
    if (e.shiftKey) {
      if (newSelection.includes(annId)) {
        newSelection = newSelection.filter(id => id !== annId)
      } else {
        newSelection.push(annId)
      }
    } else {
      if (!newSelection.includes(annId)) {
        newSelection = [annId]
      }
    }
    setSelectedAnnotationIds(newSelection)

    const primaryAnn = annotations.find(a => a.id === annId)
    if (primaryAnn) {
      setSelectedNodeId(primaryAnn.nodeId)
    }

    // Save snapshot before dragging
    useStore.getState().saveHistorySnapshot()

    // Setup multi-object dragging
    setIsDraggingObjects(true)
    setDragCanvasStart(coords)
    const initPos: Record<string, { x: number; y: number }> = {}
    newSelection.forEach(id => {
      const ann = annotations.find(a => a.id === id)
      if (ann) {
        initPos[id] = { x: ann.x, y: ann.y }
      }
    })
    setInitialAnnPositions(initPos)
  }

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'select' || e.button !== 0 || !activeLayer || activeLayer.locked) return
    e.stopPropagation()

    if (!containerRef.current) return
    const coords = getCanvasCoords(e, containerRef.current)

    // Clear annotation selection when selecting image layer
    setSelectedAnnotationIds([])
    setSelectedNodeId(null)

    useStore.getState().saveHistorySnapshot()

    setIsDraggingImage(true)
    setImageDragStart({
      x: coords.x,
      y: coords.y,
      initAlignX: activeLayer.alignX || 0,
      initAlignY: activeLayer.alignY || 0,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const coords = getCanvasCoords(e, containerRef.current)

    if (isPanning) {
      setPanX(e.clientX - panStart.x)
      setPanY(e.clientY - panStart.y)
      return
    }

    if (isDraggingImage && imageDragStart && activeLayer) {
      const dx = coords.x - imageDragStart.x
      const dy = coords.y - imageDragStart.y
      const newAlignX = Math.round(imageDragStart.initAlignX + dx)
      const newAlignY = Math.round(imageDragStart.initAlignY + dy)
      // Instant optimistic UI update without awaiting network requests during mouse movement
      useStore.setState({
        layers: layers.map(l => l.id === activeLayer.id ? { ...l, alignX: newAlignX, alignY: newAlignY } : l)
      })
      return
    }

    if (isDraggingObjects && dragCanvasStart) {
      const dx = coords.x - dragCanvasStart.x
      const dy = coords.y - dragCanvasStart.y
      // Instant optimistic UI update for all dragged annotations
      useStore.setState({
        annotations: annotations.map(a => {
          const initPos = initialAnnPositions[a.id]
          if (initPos) {
            return {
              ...a,
              x: Math.round(initPos.x + dx),
              y: Math.round(initPos.y + dy),
            }
          }
          return a
        })
      })
      return
    }

    if (resizingAnn && resizeStart) {
      const newW = Math.max(20, resizeStart.w + (coords.x - resizeStart.x))
      const newH = Math.max(20, resizeStart.h + (coords.y - resizeStart.y))
      useStore.setState({
        annotations: annotations.map(a => a.id === resizingAnn ? { ...a, width: newW, height: newH } : a)
      })
      return
    }

    if (marqueeStart) {
      const x = Math.min(marqueeStart.x, coords.x)
      const y = Math.min(marqueeStart.y, coords.y)
      const w = Math.abs(coords.x - marqueeStart.x)
      const h = Math.abs(coords.y - marqueeStart.y)
      setMarqueeRect({ x, y, w, h })
      return
    }

    if (activeTool === 'rectangle' && rectStart) {
      setNewRect({
        x: Math.min(rectStart.x, coords.x),
        y: Math.min(rectStart.y, coords.y),
        w: Math.abs(coords.x - rectStart.x),
        h: Math.abs(coords.y - rectStart.y),
      })
      return
    }
  }

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false)

    if (isDraggingImage && activeLayer) {
      updateLayer(activeLayer.id, {
        alignX: activeLayer.alignX,
        alignY: activeLayer.alignY,
      })
      setIsDraggingImage(false)
      setImageDragStart(null)
    }

    if (isDraggingObjects) {
      Object.keys(initialAnnPositions).forEach(id => {
        const ann = annotations.find(a => a.id === id)
        if (ann) {
          updateAnnotation(id, { x: ann.x, y: ann.y })
        }
      })
      setIsDraggingObjects(false)
      setDragCanvasStart(null)
      setInitialAnnPositions({})
    }

    if (marqueeRect && marqueeStart) {
      // Find all annotations on active layer within marquee bounds
      if (marqueeRect.w > 5 || marqueeRect.h > 5) {
        const found = annotations
          .filter(a => a.layerId === activeLayerId)
          .filter(a => {
            const annW = a.type === 'RECTANGLE' ? (a.width || 60) : 24
            const annH = a.type === 'RECTANGLE' ? (a.height || 40) : 24
            const annRight = a.x + annW
            const annBottom = a.y + annH
            const mRight = marqueeRect.x + marqueeRect.w
            const mBottom = marqueeRect.y + marqueeRect.h

            return (
              a.x >= marqueeRect.x &&
              a.y >= marqueeRect.y &&
              annRight <= mRight &&
              annBottom <= mBottom
            )
          })
          .map(a => a.id)

        if (found.length > 0) {
          setSelectedAnnotationIds(found)
        }
      }
      setMarqueeStart(null)
      setMarqueeRect(null)
    }

    if (resizingAnn) {
      setResizingAnn(null)
      setResizeStart(null)
      return
    }

    if (activeTool === 'rectangle') {
      setRectStart(null)
      if (newRect && newRect.w > 10 && newRect.h > 10) {
        setShowNodeForm(true)
      } else {
        setNewRect(null)
      }
    }
  }

  // Global mouseup listener to catch releases outside component container
  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (isPanning || rectStart || resizingAnn || isDraggingObjects || isDraggingImage || marqueeStart) {
        handleMouseUp()
      }
    }
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [isPanning, rectStart, resizingAnn, isDraggingObjects, isDraggingImage, marqueeStart, newRect, activeTool, marqueeRect])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.max(0.1, Math.min(5, z * delta)))
  }

  const handleCancelCreateNode = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setShowNodeForm(false)
    setNewPinPos(null)
    setNewRect(null)
    setRectStart(null)
    setNodeTitle('')
  }

  const handleCreateNode = async () => {
    if (!nodeTitle.trim() || !activeLayerId || !currentOrganId) return

    let annType: 'PIN' | 'RECTANGLE' = 'PIN'
    let x = 0, y = 0, width = 0, height = 0

    if (newPinPos) {
      annType = 'PIN'
      x = newPinPos.x
      y = newPinPos.y
    } else if (newRect) {
      annType = 'RECTANGLE'
      x = newRect.x
      y = newRect.y
      width = newRect.w
      height = newRect.h
    }

    await createNodeWithAnnotation(
      { organId: currentOrganId, layerId: activeLayerId, title: nodeTitle.trim() },
      { layerId: activeLayerId, nodeId: '', type: annType, x, y, width, height }
    )

    handleCancelCreateNode()
  }

  const handleDeleteSelected = async () => {
    if (selectedAnnotationIds.length > 0) {
      for (const annId of selectedAnnotationIds) {
        const ann = annotations.find(a => a.id === annId)
        if (ann?.nodeId) {
          await deleteNode(ann.nodeId)
        } else {
          await deleteAnnotation(annId)
        }
      }
      setSelectedAnnotationIds([])
      setSelectedNodeId(null)
    } else if (selectedNodeId) {
      await deleteNode(selectedNodeId)
      setSelectedNodeId(null)
    }
  }

  // Keyboard handlers
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNodeForm) {
          handleCancelCreateNode()
          return
        }
        setSelectedAnnotationIds([])
        setSelectedNodeId(null)
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedAnnotationIds, selectedNodeId, showNodeForm])

  return (
    <div
      ref={containerRef}
      className="canvas-container relative overflow-hidden select-none"
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{
        cursor: activeTool === 'pan' || isPanning
          ? 'grab'
          : isDraggingObjects || isDraggingImage
          ? 'move'
          : activeTool === 'pin' || activeTool === 'rectangle'
          ? 'crosshair'
          : 'default'
      }}
    >
      {/* Zoom & Hint floating indicator */}
      <div className="absolute top-3 right-3 z-10 text-xs bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E2E8F0] shadow-md flex items-center gap-3">
        <span className="font-mono font-semibold text-[#0F172A]">Zoom: {Math.round(zoom * 100)}%</span>
        {selectedAnnotationIds.length > 0 && (
          <span className="text-[#219EBC] font-bold px-2 py-0.5 rounded-full bg-[#EBF7FA] border border-[#B6E5F0]">
            Selected: {selectedAnnotationIds.length}
          </span>
        )}
      </div>

      {/* Canvas content container */}
      <div
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Visible layers */}
        {visibleLayers.length === 0 && (
          <div className="empty-state absolute inset-0" style={{ width: 400, left: '50%', top: '50%', marginLeft: -200, marginTop: -50 }}>
            <p className="text-base font-semibold text-[#5A6E7F]">Add a visual layer in the Layers panel to begin.</p>
          </div>
        )}

        {visibleLayers.map(layer => {
          const isActive = layer.id === activeLayerId
          return (
            <div key={layer.id} style={{ opacity: isActive ? 1 : layer.opacity }}>
              {layer.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={layer.imagePath}
                  alt={layer.name}
                  className={`max-w-none absolute transition-shadow ${
                    isActive && activeTool === 'select' ? 'cursor-move hover:ring-2 hover:ring-[#219EBC]/60' : 'pointer-events-none'
                  }`}
                  style={{
                    left: layer.alignX || 0,
                    top: layer.alignY || 0,
                    transform: `scale(${layer.alignScale || 1})`,
                    transformOrigin: 'top left',
                  }}
                  draggable={false}
                  onMouseDown={isActive ? handleImageMouseDown : undefined}
                />
              ) : (
                <div
                  className="border-2 border-dashed border-[#CBD5E1] rounded-2xl flex items-center justify-center text-[#5A6E7F] text-xs bg-white/50"
                  style={{ width: 600, height: 400 }}
                >
                  {layer.name} — {isActive ? 'Upload an image in Inspector' : 'No image'}
                </div>
              )}

              {/* Annotations / Pins / Regions */}
              {isActive && annotations
                .filter(a => a.layerId === layer.id)
                .map(ann => {
                  const node = nodes.find(n => n.id === ann.nodeId)
                  const isSelected = selectedAnnotationIds.includes(ann.id) || selectedNodeId === ann.nodeId
                  return (
                    <div
                      key={ann.id}
                      className="absolute group"
                      style={{
                        left: ann.x,
                        top: ann.y,
                        width: ann.type === 'RECTANGLE' ? ann.width || 60 : undefined,
                        height: ann.type === 'RECTANGLE' ? ann.height || 40 : undefined,
                      }}
                      onMouseDown={(e) => handleObjectMouseDown(ann.id, e)}
                    >
                      {ann.type === 'PIN' ? (
                        <div
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                            isSelected
                              ? 'text-[#FB8A0A] scale-125 ring-3 ring-[#219EBC] rounded-full p-1 bg-[#EBF7FA] shadow-lg'
                              : 'text-[#FB8A0A] hover:scale-110 drop-shadow-sm'
                          }`}
                          style={{ fontSize: 22 }}
                          title={node?.title || 'Pin Node'}
                        >
                          📍
                        </div>
                      ) : (
                        <div
                          className={`absolute border-2 cursor-pointer transition-all rounded-lg ${
                            isSelected
                              ? 'border-[#219EBC] bg-[#219EBC]/20 shadow-md ring-2 ring-[#219EBC]/40'
                              : 'border-[#FB8A0A] border-dashed bg-[#FB8A0A]/10 hover:border-[#DF7500]'
                          }`}
                          style={{
                            width: ann.width || 60,
                            height: ann.height || 40,
                          }}
                          title={node?.title || 'Region Node'}
                        >
                          {/* Corner resize handle when selected */}
                          {isSelected && (
                            <div
                              className="w-3.5 h-3.5 bg-[#219EBC] absolute right-0 bottom-0 cursor-se-resize rounded-tl-md z-10 shadow-xs hover:bg-[#1A86A1]"
                              onMouseDown={(e) => {
                                e.stopPropagation()
                                setResizingAnn(ann.id)
                                if (containerRef.current) {
                                  const coords = getCanvasCoords(e, containerRef.current)
                                  setResizeStart({ x: coords.x, y: coords.y, w: ann.width || 60, h: ann.height || 40 })
                                }
                              }}
                            />
                          )}
                        </div>
                      )}

                      {node && (
                        <div
                          className={`absolute text-[11px] font-bold whitespace-nowrap px-2 py-0.5 rounded-lg shadow-sm transition-colors ${
                            isSelected
                              ? 'bg-[#219EBC] text-white shadow-md'
                              : ann.type === 'PIN'
                              ? 'left-5 top-0 bg-white border border-[#E2E8F0] text-[#0F172A]'
                              : 'left-1 top-1 bg-white/95 border border-[#E2E8F0] text-[#0F172A]'
                          }`}
                        >
                          {node.title}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )
        })}

        {/* Marquee / Lasso selection rectangle */}
        {marqueeRect && (
          <div
            className="absolute border border-[#219EBC] bg-[#219EBC]/15 pointer-events-none rounded-md shadow-2xs"
            style={{
              left: marqueeRect.x,
              top: marqueeRect.y,
              width: marqueeRect.w,
              height: marqueeRect.h,
            }}
          />
        )}

        {/* New pin preview */}
        {newPinPos && (
          <div className="absolute -translate-x-1/2 -translate-y-1/2 text-[#FB8A0A] animate-bounce" style={{ left: newPinPos.x, top: newPinPos.y, fontSize: 22 }}>
            📍
          </div>
        )}

        {/* New rect/region preview */}
        {newRect && (
          <div className="absolute border-2 border-dashed border-[#219EBC] bg-[#219EBC]/20 rounded-lg" style={{ left: newRect.x, top: newRect.y, width: newRect.w, height: newRect.h }} />
        )}
      </div>

      {/* Node creation form */}
      {showNodeForm && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-white border border-[#B6E5F0] rounded-2xl shadow-xl p-5 w-84 transition-all"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
        >
          <h3 className="text-sm font-extrabold text-[#0F172A] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FB8A0A]" />
            Create Concept Node ({newRect ? 'Region' : 'Pin'})
          </h3>
          <input
            type="text"
            value={nodeTitle}
            onChange={e => setNodeTitle(e.target.value)}
            placeholder="Node title (e.g., Left Ventricle)"
            className="w-full px-3.5 py-2 border border-[#E2E8F0] rounded-xl text-sm mb-4 focus:outline-none focus:border-[#219EBC] focus:ring-2 focus:ring-[#219EBC]/20 bg-[#F6F9FA]"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreateNode()}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={handleCancelCreateNode} className="px-4 py-2 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#5A6E7F] hover:bg-[#F0F5F8] cursor-pointer">
              Cancel
            </button>
            <button onClick={handleCreateNode} className="px-4 py-2 bg-[#FB8A0A] hover:bg-[#DF7500] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#FB8A0A]/20 cursor-pointer" disabled={!nodeTitle.trim()}>
              Create Node
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
