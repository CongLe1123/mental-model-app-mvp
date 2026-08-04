'use client'

import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

export default function EditorCanvas() {
  const {
    layers, activeLayerId, activeTool, nodes, annotations,
    selectedAnnotationIds, setSelectedAnnotationIds,
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
  const [resizeDirection, setResizeDirection] = useState<'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; annX: number; annY: number; w: number; h: number } | null>(null)
  const resizeDebounceRef = useRef<NodeJS.Timeout | null>(null)

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
      useStore.setState({
        layers: layers.map(l => l.id === activeLayer.id ? { ...l, alignX: newAlignX, alignY: newAlignY } : l)
      })
      return
    }

    if (isDraggingObjects && dragCanvasStart) {
      const dx = coords.x - dragCanvasStart.x
      const dy = coords.y - dragCanvasStart.y
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

    if (resizingAnn && resizeStart && resizeDirection) {
      const dx = coords.x - resizeStart.x
      const dy = coords.y - resizeStart.y
      let newW = resizeStart.w
      let newH = resizeStart.h
      let newX = resizeStart.annX
      let newY = resizeStart.annY

      if (resizeDirection.includes('e')) {
        newW = Math.max(20, resizeStart.w + dx)
      }
      if (resizeDirection.includes('s')) {
        newH = Math.max(20, resizeStart.h + dy)
      }
      if (resizeDirection.includes('w')) {
        newW = Math.max(20, resizeStart.w - dx)
        newX = resizeStart.annX + (resizeStart.w - newW)
      }
      if (resizeDirection.includes('n')) {
        newH = Math.max(20, resizeStart.h - dy)
        newY = resizeStart.annY + (resizeStart.h - newH)
      }

      // Smooth local state update for 60fps interaction
      useStore.setState({
        annotations: annotations.map(a => a.id === resizingAnn ? { ...a, x: newX, y: newY, width: newW, height: newH } : a)
      })

      // Debounced database sync
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current)
      resizeDebounceRef.current = setTimeout(() => {
        updateAnnotation(resizingAnn, { x: newX, y: newY, width: newW, height: newH })
      }, 150)

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
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current)
      const finalAnn = annotations.find(a => a.id === resizingAnn)
      if (finalAnn) {
        updateAnnotation(resizingAnn, { x: finalAnn.x, y: finalAnn.y, width: finalAnn.width, height: finalAnn.height })
      }
      setResizingAnn(null)
      setResizeDirection(null)
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

  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (isPanning || rectStart || resizingAnn || isDraggingObjects || isDraggingImage || marqueeStart) {
        handleMouseUp()
      }
    }
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {/* Neo Zoom & Hint floating indicator */}
      <div className="absolute top-4 right-4 z-10 text-xs neo-container-sm px-3.5 py-1.5 flex items-center gap-3 bg-white">
        <span className="font-mono font-black text-black">ZOOM: {Math.round(zoom * 100)}%</span>
        {selectedAnnotationIds.length > 0 && (
          <span className="neo-badge bg-[var(--secondary)] text-black">
            SELECTED: {selectedAnnotationIds.length}
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
          <div className="neo-container p-6 bg-white absolute inset-0 text-center flex flex-col items-center justify-center gap-2" style={{ width: 400, height: 140, left: '50%', top: '50%', marginLeft: -200, marginTop: -70 }}>
            <p className="text-sm font-black uppercase text-black">NO VISIBLE VISUAL LAYER</p>
            <p className="text-xs font-semibold text-[#444444]">Add a visual layer in the Layers panel to begin authoring.</p>
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
                  className={`max-w-none absolute ${
                    isActive && activeTool === 'select' ? 'cursor-move hover:outline-3 hover:outline-black' : 'pointer-events-none'
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
                  className="border-3 border-dashed border-black bg-white/70 flex items-center justify-center text-black text-xs font-black uppercase shadow-[3px_3px_0px_#000]"
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
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform flex items-center justify-center ${
                            isSelected
                              ? 'scale-125 bg-[var(--accent)] text-black border-2 border-black shadow-[4px_4px_0px_#000] p-1'
                              : 'bg-[var(--primary)] text-black border-2 border-black shadow-[2px_2px_0px_#000] p-1 hover:scale-110'
                          }`}
                          style={{ fontSize: 20 }}
                          title={node?.title || 'Pin Node'}
                        >
                          📍
                        </div>
                      ) : (
                        <div
                          className={`absolute border-2.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-black bg-[var(--secondary)]/30 shadow-[4px_4px_0px_#000]'
                              : 'border-black border-dashed bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 shadow-[2px_2px_0px_#000]'
                          }`}
                          style={{
                            width: ann.width || 60,
                            height: ann.height || 40,
                          }}
                          title={node?.title || 'Region Node'}
                        >
                          {/* 8-Directional resize handles when selected */}
                          {isSelected && (
                            <>
                              {/* Corners */}
                              <div
                                className="w-3.5 h-3.5 bg-black border border-white absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize z-20 shadow-[1px_1px_0px_#000] hover:scale-125"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setResizingAnn(ann.id)
                                  setResizeDirection('nw')
                                  if (containerRef.current) {
                                    const coords = getCanvasCoords(e, containerRef.current)
                                    setResizeStart({ x: coords.x, y: coords.y, annX: ann.x, annY: ann.y, w: ann.width || 60, h: ann.height || 40 })
                                  }
                                }}
                              />
                              <div
                                className="w-3.5 h-3.5 bg-black border border-white absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize z-20 shadow-[1px_1px_0px_#000] hover:scale-125"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setResizingAnn(ann.id)
                                  setResizeDirection('ne')
                                  if (containerRef.current) {
                                    const coords = getCanvasCoords(e, containerRef.current)
                                    setResizeStart({ x: coords.x, y: coords.y, annX: ann.x, annY: ann.y, w: ann.width || 60, h: ann.height || 40 })
                                  }
                                }}
                              />
                              <div
                                className="w-3.5 h-3.5 bg-black border border-white absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize z-20 shadow-[1px_1px_0px_#000] hover:scale-125"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setResizingAnn(ann.id)
                                  setResizeDirection('sw')
                                  if (containerRef.current) {
                                    const coords = getCanvasCoords(e, containerRef.current)
                                    setResizeStart({ x: coords.x, y: coords.y, annX: ann.x, annY: ann.y, w: ann.width || 60, h: ann.height || 40 })
                                  }
                                }}
                              />
                              <div
                                className="w-3.5 h-3.5 bg-black border border-white absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize z-20 shadow-[1px_1px_0px_#000] hover:scale-125"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setResizingAnn(ann.id)
                                  setResizeDirection('se')
                                  if (containerRef.current) {
                                    const coords = getCanvasCoords(e, containerRef.current)
                                    setResizeStart({ x: coords.x, y: coords.y, annX: ann.x, annY: ann.y, w: ann.width || 60, h: ann.height || 40 })
                                  }
                                }}
                              />
                              {/* Edges */}
                              <div
                                className="w-3.5 h-3.5 bg-black border border-white absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize z-20 shadow-[1px_1px_0px_#000] hover:scale-125"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setResizingAnn(ann.id)
                                  setResizeDirection('n')
                                  if (containerRef.current) {
                                    const coords = getCanvasCoords(e, containerRef.current)
                                    setResizeStart({ x: coords.x, y: coords.y, annX: ann.x, annY: ann.y, w: ann.width || 60, h: ann.height || 40 })
                                  }
                                }}
                              />
                              <div
                                className="w-3.5 h-3.5 bg-black border border-white absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize z-20 shadow-[1px_1px_0px_#000] hover:scale-125"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setResizingAnn(ann.id)
                                  setResizeDirection('s')
                                  if (containerRef.current) {
                                    const coords = getCanvasCoords(e, containerRef.current)
                                    setResizeStart({ x: coords.x, y: coords.y, annX: ann.x, annY: ann.y, w: ann.width || 60, h: ann.height || 40 })
                                  }
                                }}
                              />
                              <div
                                className="w-3.5 h-3.5 bg-black border border-white absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize z-20 shadow-[1px_1px_0px_#000] hover:scale-125"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setResizingAnn(ann.id)
                                  setResizeDirection('w')
                                  if (containerRef.current) {
                                    const coords = getCanvasCoords(e, containerRef.current)
                                    setResizeStart({ x: coords.x, y: coords.y, annX: ann.x, annY: ann.y, w: ann.width || 60, h: ann.height || 40 })
                                  }
                                }}
                              />
                              <div
                                className="w-3.5 h-3.5 bg-black border border-white absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize z-20 shadow-[1px_1px_0px_#000] hover:scale-125"
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  setResizingAnn(ann.id)
                                  setResizeDirection('e')
                                  if (containerRef.current) {
                                    const coords = getCanvasCoords(e, containerRef.current)
                                    setResizeStart({ x: coords.x, y: coords.y, annX: ann.x, annY: ann.y, w: ann.width || 60, h: ann.height || 40 })
                                  }
                                }}
                              />
                            </>
                          )}
                        </div>
                      )}

                      {node && (
                        <div
                          className={`absolute neo-badge text-xs font-black uppercase whitespace-nowrap ${
                            isSelected
                              ? 'bg-[var(--primary)] text-black shadow-[3px_3px_0px_#000]'
                              : ann.type === 'PIN'
                              ? 'left-6 top-0 bg-white text-black shadow-[2px_2px_0px_#000]'
                              : 'left-1 top-1 bg-white text-black shadow-[2px_2px_0px_#000]'
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
            className="absolute border-2 border-black bg-[var(--primary)]/25 pointer-events-none shadow-[3px_3px_0px_#000]"
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
          <div className="absolute -translate-x-1/2 -translate-y-1/2 bg-[var(--accent)] border-2 border-black p-1 text-black shadow-[3px_3px_0px_#000] animate-bounce" style={{ left: newPinPos.x, top: newPinPos.y, fontSize: 20 }}>
            📍
          </div>
        )}

        {/* New rect/region preview */}
        {newRect && (
          <div className="absolute border-2.5 border-dashed border-black bg-[var(--secondary)]/30 shadow-[3px_3px_0px_#000]" style={{ left: newRect.x, top: newRect.y, width: newRect.w, height: newRect.h }} />
        )}
      </div>

      {/* Node creation form popover */}
      {showNodeForm && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-30 neo-container p-5 w-90 bg-white shadow-[6px_6px_0px_#000] space-y-3"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
        >
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="w-3 h-3 border border-black bg-[var(--accent)]" />
            CREATE CONCEPT NODE ({newRect ? 'REGION' : 'PIN'})
          </h3>
          <input
            type="text"
            value={nodeTitle}
            onChange={e => setNodeTitle(e.target.value)}
            placeholder="Node title (e.g., Left Ventricle)"
            className="neo-input w-full px-3.5 py-2 text-sm"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreateNode()}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={handleCancelCreateNode} className="neo-btn neo-btn-white px-4 py-2 text-xs font-bold">
              CANCEL
            </button>
            <button onClick={handleCreateNode} className="neo-btn neo-btn-accent px-4 py-2 text-xs font-black" disabled={!nodeTitle.trim()}>
              CREATE NODE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
