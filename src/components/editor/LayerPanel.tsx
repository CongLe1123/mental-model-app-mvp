'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function LayerPanel() {
  const {
    layers, activeLayerId, setActiveLayerId, updateLayer, deleteLayer,
    createLayer, cloneLayer, reorderLayers, currentOrganId, annotations
  } = useStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newLayerName, setNewLayerName] = useState('')

  // Drag to reorder state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // Sort layers by order (display highest order at top like Photoshop, or standard order)
  const sortedLayers = [...layers].sort((a, b) => b.order - a.order)

  const activeLayer = layers.find(l => l.id === activeLayerId)

  const handleCreateLayer = async () => {
    if (!newLayerName.trim() || !currentOrganId) return
    await createLayer(currentOrganId, newLayerName.trim())
    setNewLayerName('')
    setShowCreateModal(false)
  }

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(id)
    setEditingName(currentName)
  }

  const handleSaveRename = async (id: string) => {
    if (editingName.trim() && editingName !== layers.find(l => l.id === id)?.name) {
      // Optimistic update
      useStore.setState({
        layers: layers.map(l => l.id === id ? { ...l, name: editingName.trim() } : l)
      })
      await updateLayer(id, { name: editingName.trim() })
    }
    setEditingId(null)
  }

  const handleOpacityChange = (opacity: number) => {
    if (!activeLayer) return
    // Optimistic UI update
    useStore.setState({
      layers: layers.map(l => l.id === activeLayer.id ? { ...l, opacity } : l)
    })

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      updateLayer(activeLayer.id, { opacity })
    }, 300)
  }

  // Drag & Drop handlers for layer reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...sortedLayers]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(index, 0, moved)

    // Assign new reverse order indices
    const updatedIds = reordered.map(l => l.id).reverse()

    // Optimistic store update
    const updatedLayers = layers.map(l => {
      const newOrder = updatedIds.indexOf(l.id)
      return { ...l, order: newOrder }
    })
    useStore.setState({ layers: updatedLayers })

    setDraggedIndex(null)
    setDragOverIndex(null)

    await reorderLayers(updatedIds)
  }

  const handleMoveLayer = async (direction: 'up' | 'down') => {
    if (!activeLayer) return
    const currentIndex = sortedLayers.findIndex(l => l.id === activeLayer.id)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedLayers.length) return

    const reordered = [...sortedLayers]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    const updatedIds = reordered.map(l => l.id).reverse()
    await reorderLayers(updatedIds)
  }

  const handleDuplicateActive = async () => {
    if (!activeLayer) return
    await cloneLayer(activeLayer.id, `${activeLayer.name} Copy`)
  }

  const handleDeleteActive = async () => {
    if (!activeLayer) return
    if (confirm(`Delete layer "${activeLayer.name}" and all its contents?`)) {
      await deleteLayer(activeLayer.id)
    }
  }

  return (
    <div className="flex flex-col h-full border-r border-[#E2E8F0] bg-white select-none text-xs">
      {/* Panel Header */}
      <div className="p-3 border-b border-[#E2E8F0] bg-[#F6F9FA] flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-[11px] tracking-wider uppercase text-[#0F172A]">
          <span className="w-2 h-2 rounded-full bg-[#219EBC]" />
          <span>Layers</span>
          <span className="px-2 py-0.5 rounded-full bg-[#EBF7FA] text-[10px] font-bold text-[#219EBC] border border-[#B6E5F0]">
            {layers.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-2.5 py-1 bg-[#219EBC] hover:bg-[#1A86A1] text-white rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
          title="Create New Layer"
        >
          <span>+</span> New Layer
        </button>
      </div>

      {/* Layer Controls Bar (Opacity & Visibility) */}
      {activeLayer && (
        <div className="px-3 py-2.5 border-b border-[#E2E8F0] bg-[#EBF7FA]/40 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#5A6E7F]">
            <span>Opacity: <strong className="text-[#0F172A] font-bold">{Math.round(activeLayer.opacity * 100)}%</strong></span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateLayer(activeLayer.id, { visible: !activeLayer.visible })}
                className={`p-1 rounded-md hover:bg-white transition-colors cursor-pointer ${activeLayer.visible ? 'text-[#0F172A]' : 'opacity-40'}`}
                title={activeLayer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {activeLayer.visible ? '👁️' : '🕶️'}
              </button>
              <button
                onClick={() => updateLayer(activeLayer.id, { locked: !activeLayer.locked })}
                className={`p-1 rounded-md hover:bg-white transition-colors cursor-pointer ${activeLayer.locked ? 'text-[#FB8A0A]' : 'opacity-40'}`}
                title={activeLayer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {activeLayer.locked ? '🔒' : '🔓'}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={activeLayer.opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 cursor-pointer accent-[#219EBC] bg-[#CBD5E1] rounded-lg"
          />
        </div>
      )}

      {/* Inline Create Modal */}
      {showCreateModal && (
        <div className="p-3 border-b border-[#219EBC] bg-[#EBF7FA]">
          <input
            type="text"
            value={newLayerName}
            onChange={e => setNewLayerName(e.target.value)}
            placeholder="Layer name..."
            className="w-full px-2.5 py-1.5 border border-[#B6E5F0] rounded-lg text-xs mb-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#219EBC]/30"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateLayer()
              if (e.key === 'Escape') setShowCreateModal(false)
            }}
          />
          <div className="flex gap-1.5 justify-end">
            <button onClick={handleCreateLayer} className="px-3 py-1 bg-[#219EBC] text-white rounded-md text-[11px] font-semibold cursor-pointer">Add</button>
            <button onClick={() => setShowCreateModal(false)} className="px-3 py-1 border border-[#E2E8F0] bg-white rounded-md text-[11px] text-[#5A6E7F] cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {/* Layer List Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sortedLayers.length === 0 && (
          <div className="py-12 text-center text-[#5A6E7F] text-xs">
            No layers found.<br />Click "+ New Layer" to add one.
          </div>
        )}

        {sortedLayers.map((layer, index) => {
          const isActive = layer.id === activeLayerId
          const annCount = annotations.filter(a => a.layerId === layer.id).length
          const isDragging = draggedIndex === index
          const isDragOver = dragOverIndex === index

          return (
            <div
              key={layer.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onClick={() => setActiveLayerId(layer.id)}
              className={`group relative flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#EBF7FA] border-[#219EBC] border-l-4 border-l-[#219EBC] text-[#219EBC] font-semibold shadow-2xs'
                  : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F0F5F8] text-[#0F172A]'
              } ${isDragging ? 'opacity-40 border-dashed border-gray-400' : ''} ${
                isDragOver ? 'border-t-2 border-t-[#219EBC]' : ''
              }`}
            >
              {/* Drag handle grip */}
              <span className="text-[#5A6E7F] cursor-grab hover:text-[#0F172A] opacity-40 group-hover:opacity-100 text-[10px]">
                ⋮⋮
              </span>

              {/* Visibility Toggle Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  updateLayer(layer.id, { visible: !layer.visible })
                }}
                className={`text-[12px] p-0.5 hover:scale-110 transition-transform ${layer.visible ? 'opacity-100' : 'opacity-25'}`}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                👁️
              </button>

              {/* Visual Thumbnail */}
              <div className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 relative shadow-2xs">
                {layer.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={layer.imagePath} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-[#5A6E7F] font-mono font-bold uppercase">{layer.name.slice(0, 2)}</span>
                )}
                {!layer.visible && <div className="absolute inset-0 bg-black/20" />}
              </div>

              {/* Layer Title */}
              <div className="flex-1 min-w-0 pr-1" onDoubleClick={(e) => handleStartRename(layer.id, layer.name, e)}>
                {editingId === layer.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => handleSaveRename(layer.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveRename(layer.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="w-full px-1.5 py-0.5 text-xs border border-[#219EBC] rounded-md bg-white text-[#0F172A] focus:outline-none"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs" title={layer.name}>
                      {layer.name}
                    </span>
                    {annCount > 0 && (
                      <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded-full bg-[#FB8A0A]/15 text-[#FB8A0A] font-bold font-mono border border-[#FB8A0A]/20">
                        {annCount}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Lock Icon Indicator */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  updateLayer(layer.id, { locked: !layer.locked })
                }}
                className={`text-[11px] p-0.5 ${layer.locked ? 'opacity-100 text-[#FB8A0A]' : 'opacity-0 group-hover:opacity-40'}`}
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Photoshop Bottom Action Bar */}
      <div className="p-2 border-t border-[#E2E8F0] bg-[#F6F9FA] flex items-center justify-around text-sm">
        <button
          onClick={() => handleMoveLayer('up')}
          disabled={!activeLayer || sortedLayers.findIndex(l => l.id === activeLayer.id) === 0}
          className="p-1.5 rounded-md hover:bg-[#EBF7FA] hover:text-[#219EBC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Move Layer Up"
        >
          ▲
        </button>
        <button
          onClick={() => handleMoveLayer('down')}
          disabled={!activeLayer || sortedLayers.findIndex(l => l.id === activeLayer.id) === sortedLayers.length - 1}
          className="p-1.5 rounded-md hover:bg-[#EBF7FA] hover:text-[#219EBC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Move Layer Down"
        >
          ▼
        </button>
        <button
          onClick={handleDuplicateActive}
          disabled={!activeLayer}
          className="p-1.5 rounded-md hover:bg-[#EBF7FA] hover:text-[#219EBC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Duplicate Active Layer"
        >
          ⧉
        </button>
        <button
          onClick={handleDeleteActive}
          disabled={!activeLayer}
          className="p-1.5 text-red-500 rounded-md hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Delete Active Layer"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
