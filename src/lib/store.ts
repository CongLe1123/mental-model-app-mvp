'use client'

import { create } from 'zustand'
import type {
  OrganData, VisualLayerData, AnnotationData, ConceptNodeData,
  RelationshipData, ReasoningPathData, HyperedgeData, EvidenceData, DeleteImpact,
  NodeWithRelations,
} from './types'

export type EditorTool = 'select' | 'pan' | 'pin' | 'rectangle' | 'relationship' | 'reasoning-path' | 'hyperedge'

interface EditorState {
  // Organs
  organs: OrganData[]
  loadOrgans: () => Promise<void>

  // Current organ
  currentOrganId: string | null
  setCurrentOrganId: (id: string | null) => void

  // Layers
  layers: VisualLayerData[]
  activeLayerId: string | null
  setActiveLayerId: (id: string | null) => void
  loadLayers: (organId: string) => Promise<void>

  // Annotations
  annotations: AnnotationData[]
  selectedAnnotationId: string | null
  selectedAnnotationIds: string[]
  setSelectedAnnotationId: (id: string | null) => void
  setSelectedAnnotationIds: (ids: string[]) => void

  // Nodes
  nodes: ConceptNodeData[]
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void

  // Relationships
  relationships: RelationshipData[]
  selectedRelationshipId: string | null
  setSelectedRelationshipId: (id: string | null) => void

  // Reasoning Paths
  reasoningPaths: ReasoningPathData[]
  selectedPathId: string | null
  setSelectedPathId: (id: string | null) => void

  // Hyperedges
  hyperedges: HyperedgeData[]
  selectedHyperedgeId: string | null
  setSelectedHyperedgeId: (id: string | null) => void

  // Evidence
  evidence: EvidenceData[]

  // Editor state
  activeTool: EditorTool
  setActiveTool: (tool: EditorTool) => void
  activeLens: string
  setActiveLens: (lens: string) => void
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'failed'
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved' | 'failed') => void
  loadError: string | null
  setLoadError: (err: string | null) => void

  // Undo / Redo history
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  saveHistorySnapshot: () => void

  // Load all organ data
  loadOrganData: (organId: string) => Promise<void>

  // Actions
  createOrgan: (name: string, description?: string) => Promise<OrganData | null>
  renameOrgan: (id: string, name: string) => Promise<void>
  deleteOrgan: (id: string) => Promise<void>

  // Layer actions
  createLayer: (organId: string, name: string) => Promise<VisualLayerData | null>
  cloneLayer: (layerId: string, newName: string) => Promise<VisualLayerData | null>
  updateLayer: (id: string, data: Partial<VisualLayerData>) => Promise<void>
  reorderLayers: (layerIds: string[]) => Promise<void>
  deleteLayer: (id: string) => Promise<void>

  // Annotation actions
  createAnnotation: (data: Partial<AnnotationData>) => Promise<AnnotationData | null>
  updateAnnotation: (id: string, data: Partial<AnnotationData>) => Promise<void>
  deleteAnnotation: (id: string) => Promise<void>
  createNodeWithAnnotation: (node: Partial<ConceptNodeData>, annotation: Partial<AnnotationData>) => Promise<{ node: ConceptNodeData; annotation: AnnotationData } | null>

  // Node actions
  createNode: (data: Partial<ConceptNodeData>) => Promise<ConceptNodeData | null>
  updateNode: (id: string, data: Partial<ConceptNodeData>) => Promise<void>
  getNodeWithRelations: (id: string) => Promise<NodeWithRelations | null>
  getDeleteImpact: (nodeId: string) => Promise<DeleteImpact>
  deleteNode: (id: string) => Promise<void>

  // Relationship actions
  createRelationship: (data: Partial<RelationshipData>) => Promise<RelationshipData | null>
  updateRelationship: (id: string, data: Partial<RelationshipData>) => Promise<void>
  deleteRelationship: (id: string) => Promise<void>

  // Reasoning path
  createReasoningPath: (data: { name: string; organId: string }) => Promise<ReasoningPathData | null>
  updateReasoningPath: (id: string, data: Partial<ReasoningPathData>) => Promise<void>
  deleteReasoningPath: (id: string) => Promise<void>
  addPathStep: (pathId: string, nodeId: string, order: number, explanation?: string) => Promise<void>
  removePathStep: (stepId: string, pathId: string) => Promise<void>
  reorderPathSteps: (pathId: string, stepIds: string[]) => Promise<void>

  // Hyperedge
  createHyperedge: (data: { name: string; organId: string }) => Promise<HyperedgeData | null>
  updateHyperedge: (id: string, data: Partial<HyperedgeData>) => Promise<void>
  deleteHyperedge: (id: string) => Promise<void>
  addHyperedgeMember: (hyperedgeId: string, nodeId: string, isOutcome?: boolean) => Promise<void>
  removeHyperedgeMember: (memberId: string, hyperedgeId: string) => Promise<void>

  // Evidence
  createEvidence: (data: Partial<EvidenceData>) => Promise<EvidenceData | null>
  updateEvidence: (id: string, data: Partial<EvidenceData>) => Promise<void>
  deleteEvidence: (id: string) => Promise<void>

  // JSON Import & Export
  importOrganJSON: (jsonData: any) => Promise<OrganData | null>
  exportOrganJSON: (organId: string) => Promise<any>
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API error: ${res.status}`)
  }
  return res.json()
}
type HistorySnapshot = {
  layers: VisualLayerData[]
  nodes: ConceptNodeData[]
  annotations: AnnotationData[]
  relationships: RelationshipData[]
  reasoningPaths: ReasoningPathData[]
  hyperedges: HyperedgeData[]
  evidence: EvidenceData[]
}

// eslint-disable-next-line prefer-const
let historyPast: HistorySnapshot[] = []
let historyFuture: HistorySnapshot[] = []

export const useStore = create<EditorState>((set, get) => ({
  // State
  organs: [],
  currentOrganId: null,
  layers: [],
  activeLayerId: null,
  annotations: [],
  selectedAnnotationId: null,
  selectedAnnotationIds: [],
  nodes: [],
  selectedNodeId: null,
  relationships: [],
  selectedRelationshipId: null,
  reasoningPaths: [],
  selectedPathId: null,
  hyperedges: [],
  selectedHyperedgeId: null,
  evidence: [],
  activeTool: 'select',
  activeLens: 'general-info',
  saveStatus: 'saved',
  loadError: null,
  canUndo: false,
  canRedo: false,

  saveHistorySnapshot: () => {
    const state = get()
    const snapshot = {
      layers: state.layers,
      nodes: state.nodes,
      annotations: state.annotations,
      relationships: state.relationships,
      reasoningPaths: state.reasoningPaths,
      hyperedges: state.hyperedges,
      evidence: state.evidence,
    }
    historyPast.push(snapshot)
    if (historyPast.length > 50) historyPast.shift()
    historyFuture = []
    set({ canUndo: historyPast.length > 0, canRedo: false })
  },

  undo: () => {
    if (historyPast.length === 0) return
    const currentState = {
      layers: get().layers,
      nodes: get().nodes,
      annotations: get().annotations,
      relationships: get().relationships,
      reasoningPaths: get().reasoningPaths,
      hyperedges: get().hyperedges,
      evidence: get().evidence,
    }
    historyFuture.push(currentState)
    const previousState = historyPast.pop()!

    set({
      ...previousState,
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
    })
  },

  redo: () => {
    if (historyFuture.length === 0) return
    const currentState = {
      layers: get().layers,
      nodes: get().nodes,
      annotations: get().annotations,
      relationships: get().relationships,
      reasoningPaths: get().reasoningPaths,
      hyperedges: get().hyperedges,
      evidence: get().evidence,
    }
    historyPast.push(currentState)
    const nextState = historyFuture.pop()!

    set({
      ...nextState,
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
    })
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveLens: (lens) => set({ activeLens: lens }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setLoadError: (err) => set({ loadError: err }),
  setActiveLayerId: (id) => set({ activeLayerId: id }),
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id, selectedAnnotationIds: id ? [id] : [] }),
  setSelectedAnnotationIds: (ids) => set({ selectedAnnotationIds: ids, selectedAnnotationId: ids.length > 0 ? ids[ids.length - 1] : null }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedRelationshipId: (id) => set({ selectedRelationshipId: id }),
  setSelectedPathId: (id) => set({ selectedPathId: id }),
  setSelectedHyperedgeId: (id) => set({ selectedHyperedgeId: id }),
  setCurrentOrganId: (id) => set({ currentOrganId: id }),

  // Load organs
  loadOrgans: async () => {
    const data = await api('/api/organs')
    set({ organs: data })
  },

  // Load all data for an organ
  loadOrganData: async (organId: string) => {
    set({ loadError: null })
    try {
      const data = await api(`/api/organs/${organId}`)
      set({
        currentOrganId: organId,
        layers: data.visualLayers || [],
        nodes: data.conceptNodes || [],
        relationships: data.relationships || [],
        reasoningPaths: data.reasoningPaths || [],
        hyperedges: data.hyperedges || [],
        activeLayerId: data.visualLayers?.[0]?.id || null,
        annotations: [],
        evidence: [],
      })
      // Load annotations
      if (data.visualLayers?.length > 0) {
        const annRes = await api(`/api/annotations?organId=${organId}`)
        set({ annotations: annRes })
      }
      // Load evidence
      const evRes = await api(`/api/evidence?organId=${organId}`)
      set({ evidence: evRes })
    } catch (e) {
      set({ loadError: e instanceof Error ? e.message : String(e) })
    }
  },

  loadLayers: async (organId: string) => {
    const data = await api(`/api/organs/${organId}`)
    set({ layers: data.visualLayers || [] })
  },

  // Organ actions
  createOrgan: async (name, description = '') => {
    const data = await api('/api/organs', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    })
    await get().loadOrgans()
    return data
  },

  renameOrgan: async (id, name) => {
    await api(`/api/organs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })
    await get().loadOrgans()
  },

  deleteOrgan: async (id) => {
    await api(`/api/organs/${id}`, { method: 'DELETE' })
    await get().loadOrgans()
  },

  // Layer actions
  createLayer: async (organId, name) => {
    set({ saveStatus: 'saving' })
    try {
      const data = await api(`/api/organs/${organId}/layers`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      await get().loadLayers(organId)
      set({ activeLayerId: data.id, saveStatus: 'saved' })
      return data
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  cloneLayer: async (layerId, newName) => {
    set({ saveStatus: 'saving' })
    try {
      const data = await api(`/api/organs/${get().currentOrganId}/layers/clone`, {
        method: 'POST',
        body: JSON.stringify({ layerId, name: newName }),
      })
      await get().loadLayers(get().currentOrganId!)
      set({ saveStatus: 'saved' })
      return data
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  updateLayer: async (id, data) => {
    const organId = get().currentOrganId
    if (!organId) return
    set({ saveStatus: 'saving' })
    try {
      await api(`/api/organs/${organId}/layers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      await get().loadLayers(organId)
      set({ saveStatus: 'saved' })
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  reorderLayers: async (layerIds: string[]) => {
    const organId = get().currentOrganId
    if (!organId) return
    set({ saveStatus: 'saving' })
    try {
      const updated = await api(`/api/organs/${organId}/layers/reorder`, {
        method: 'POST',
        body: JSON.stringify({ layerIds }),
      })
      set({ layers: updated, saveStatus: 'saved' })
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  deleteLayer: async (id) => {
    const organId = get().currentOrganId
    if (!organId) return
    set({ saveStatus: 'saving' })
    try {
      await api(`/api/organs/${organId}/layers/${id}`, { method: 'DELETE' })
      await get().loadOrganData(organId)
      set({ saveStatus: 'saved' })
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  // Annotation actions
  createAnnotation: async (data) => {
    set({ saveStatus: 'saving' })
    try {
      const result = await api('/api/annotations', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set((s) => ({ annotations: [...s.annotations, result], saveStatus: 'saved' }))
      return result
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  updateAnnotation: async (id, data) => {
    await api(`/api/annotations?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    set({ saveStatus: 'saved' })
  },

  deleteAnnotation: async (id) => {
    set({ saveStatus: 'saving' })
    try {
      await api(`/api/annotations?id=${id}`, { method: 'DELETE' })
      set((s) => ({ annotations: s.annotations.filter(a => a.id !== id), saveStatus: 'saved' }))
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  createNodeWithAnnotation: async (nodeData, annData) => {
    set({ saveStatus: 'saving' })
    try {
      const result = await api('/api/nodes/with-annotation', {
        method: 'POST',
        body: JSON.stringify({ node: nodeData, annotation: annData }),
      })
      set((s) => ({
        nodes: [...s.nodes, result.node],
        annotations: [...s.annotations, result.annotation],
        saveStatus: 'saved',
      }))
      return result
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  createNode: async (data) => {
    set({ saveStatus: 'saving' })
    try {
      const result = await api('/api/nodes', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set((s) => ({ nodes: [...s.nodes, result], saveStatus: 'saved' }))
      return result
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  updateNode: async (id, data) => {
    await api(`/api/nodes?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    set((s) => ({
      nodes: s.nodes.map(n => n.id === id ? { ...n, ...data } : n),
      saveStatus: 'saved',
    }))
  },

  getNodeWithRelations: async (id) => {
    return api(`/api/nodes/${id}`)
  },

  getDeleteImpact: async (nodeId) => {
    return api(`/api/nodes/${nodeId}/impact`)
  },

  deleteNode: async (id) => {
    set({ saveStatus: 'saving' })
    try {
      await api(`/api/nodes?id=${id}`, { method: 'DELETE' })
      set((s) => {
        const deletedAnnIds = s.annotations.filter(a => a.nodeId === id).map(a => a.id)
        return {
          nodes: s.nodes.filter(n => n.id !== id),
          annotations: s.annotations.filter(a => a.nodeId !== id),
          relationships: s.relationships.filter(r => r.sourceNodeId !== id && r.targetNodeId !== id),
          reasoningPaths: s.reasoningPaths.map(rp => ({
            ...rp,
            steps: rp.steps.filter(st => st.nodeId !== id),
          })),
          hyperedges: s.hyperedges.map(h => ({
            ...h,
            members: h.members.filter(m => m.nodeId !== id),
          })),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
          selectedAnnotationId: deletedAnnIds.includes(s.selectedAnnotationId || '') ? null : s.selectedAnnotationId,
          saveStatus: 'saved',
        }
      })
    } catch (err) {
      console.error('Failed to delete node:', err)
      set({ saveStatus: 'failed' })
    }
  },

  // Relationship actions
  createRelationship: async (data) => {
    set({ saveStatus: 'saving' })
    try {
      const result = await api('/api/relationships', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set((s) => ({ relationships: [...s.relationships, result], saveStatus: 'saved' }))
      return result
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  updateRelationship: async (id, data) => {
    await api(`/api/relationships?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    set((s) => ({
      relationships: s.relationships.map(r => r.id === id ? { ...r, ...data } : r),
      saveStatus: 'saved',
    }))
  },

  deleteRelationship: async (id) => {
    set({ saveStatus: 'saving' })
    try {
      await api(`/api/relationships?id=${id}`, { method: 'DELETE' })
      set((s) => ({
        relationships: s.relationships.filter(r => r.id !== id),
        saveStatus: 'saved',
      }))
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  // Reasoning Path
  createReasoningPath: async (data) => {
    set({ saveStatus: 'saving' })
    try {
      const result = await api('/api/reasoning-paths', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set((s) => ({ reasoningPaths: [...s.reasoningPaths, result], saveStatus: 'saved' }))
      return result
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  updateReasoningPath: async (id, data) => {
    await api(`/api/reasoning-paths?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    set((s) => ({
      reasoningPaths: s.reasoningPaths.map(p => p.id === id ? { ...p, ...data } : p),
      saveStatus: 'saved',
    }))
  },

  deleteReasoningPath: async (id) => {
    set({ saveStatus: 'saving' })
    try {
      await api(`/api/reasoning-paths?id=${id}`, { method: 'DELETE' })
      set((s) => ({
        reasoningPaths: s.reasoningPaths.filter(p => p.id !== id),
        saveStatus: 'saved',
      }))
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  addPathStep: async (pathId, nodeId, order, explanation = '') => {
    set({ saveStatus: 'saving' })
    try {
      const step = await api(`/api/reasoning-paths/${pathId}/steps`, {
        method: 'POST',
        body: JSON.stringify({ nodeId, order, explanation }),
      })
      set((s) => ({
        reasoningPaths: s.reasoningPaths.map(p =>
          p.id === pathId ? { ...p, steps: [...(p.steps || []), step] } : p
        ),
        saveStatus: 'saved',
      }))
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  removePathStep: async (stepId, pathId) => {
    await api(`/api/reasoning-paths/${pathId}/steps?id=${stepId}`, { method: 'DELETE' })
    set((s) => ({
      reasoningPaths: s.reasoningPaths.map(p =>
        p.id === pathId ? { ...p, steps: (p.steps || []).filter(st => st.id !== stepId) } : p
      ),
      saveStatus: 'saved',
    }))
  },

  reorderPathSteps: async (pathId, stepIds) => {
    await api(`/api/reasoning-paths/${pathId}/steps/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ stepIds }),
    })
    set({ saveStatus: 'saved' })
  },

  // Hyperedge
  createHyperedge: async (data) => {
    set({ saveStatus: 'saving' })
    try {
      const result = await api('/api/hyperedges', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set((s) => ({ hyperedges: [...s.hyperedges, result], saveStatus: 'saved' }))
      return result
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  updateHyperedge: async (id, data) => {
    await api(`/api/hyperedges?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    set((s) => ({
      hyperedges: s.hyperedges.map(h => h.id === id ? { ...h, ...data } : h),
      saveStatus: 'saved',
    }))
  },

  deleteHyperedge: async (id) => {
    set({ saveStatus: 'saving' })
    try {
      await api(`/api/hyperedges?id=${id}`, { method: 'DELETE' })
      set((s) => ({
        hyperedges: s.hyperedges.filter(h => h.id !== id),
        saveStatus: 'saved',
      }))
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  addHyperedgeMember: async (hyperedgeId, nodeId, isOutcome = false) => {
    set({ saveStatus: 'saving' })
    try {
      const member = await api(`/api/hyperedges/${hyperedgeId}/members`, {
        method: 'POST',
        body: JSON.stringify({ nodeId, isOutcome }),
      })
      set((s) => ({
        hyperedges: s.hyperedges.map(h =>
          h.id === hyperedgeId ? { ...h, members: [...(h.members || []), member] } : h
        ),
        saveStatus: 'saved',
      }))
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  removeHyperedgeMember: async (memberId, hyperedgeId) => {
    await api(`/api/hyperedges/${hyperedgeId}/members?id=${memberId}`, { method: 'DELETE' })
    set((s) => ({
      hyperedges: s.hyperedges.map(h =>
        h.id === hyperedgeId ? { ...h, members: (h.members || []).filter(m => m.id !== memberId) } : h
      ),
      saveStatus: 'saved',
    }))
  },

  // Evidence
  createEvidence: async (data) => {
    set({ saveStatus: 'saving' })
    try {
      const result = await api('/api/evidence', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set((s) => ({ evidence: [...s.evidence, result], saveStatus: 'saved' }))
      return result
    } catch {
      set({ saveStatus: 'failed' })
      return null
    }
  },

  updateEvidence: async (id, data) => {
    await api(`/api/evidence?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    set((s) => ({
      evidence: s.evidence.map(e => e.id === id ? { ...e, ...data } : e),
      saveStatus: 'saved',
    }))
  },

  deleteEvidence: async (id) => {
    set({ saveStatus: 'saving' })
    try {
      await api(`/api/evidence?id=${id}`, { method: 'DELETE' })
      set((s) => ({
        evidence: s.evidence.filter(e => e.id !== id),
        saveStatus: 'saved',
      }))
    } catch {
      set({ saveStatus: 'failed' })
    }
  },

  importOrganJSON: async (jsonData: any) => {
    set({ saveStatus: 'saving' })
    try {
      const createdOrgan = await api('/api/organs/import', {
        method: 'POST',
        body: JSON.stringify(jsonData),
      })
      await get().loadOrgans()
      set({ saveStatus: 'saved' })
      return createdOrgan
    } catch (e) {
      console.error('Import failed:', e)
      set({ saveStatus: 'failed' })
      return null
    }
  },

  exportOrganJSON: async (organId: string) => {
    try {
      const data = await api(`/api/organs/${organId}/export`)
      return data
    } catch (e) {
      console.error('Export failed:', e)
      return null
    }
  },
}))
