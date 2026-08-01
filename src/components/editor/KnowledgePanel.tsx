'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'

export default function KnowledgePanel() {
  const {
    nodes, layers, relationships, reasoningPaths, evidence,
    selectedNodeId, setSelectedNodeId,
    selectedRelationshipId, setSelectedRelationshipId,
    activeLens,
    createRelationship, deleteRelationship,
    createReasoningPath, deleteReasoningPath,
    addPathStep, removePathStep,
    createEvidence, deleteEvidence, updateEvidence,
    currentOrganId, activeLayerId,
  } = useStore()

  const [tab, setTab] = useState<'nodes' | 'relationships' | 'hyperedges' | 'evidence'>('nodes')

  // Create relationship form
  const [relForm, setRelForm] = useState({ sourceNodeId: '', targetNodeId: '', type: 'PART_OF', lens: 'HIERARCHY', label: '', explanation: '' })

  const handleCreateRelationship = async () => {
    if (!relForm.sourceNodeId || !relForm.targetNodeId || !currentOrganId) return
    await createRelationship({ ...relForm, organId: currentOrganId })
    setRelForm({ sourceNodeId: '', targetNodeId: '', type: 'PART_OF', lens: 'HIERARCHY', label: '', explanation: '' })
  }

  // Create path (Hyper Edge)
  const [pathName, setPathName] = useState('')
  const handleCreatePath = async () => {
    if (!pathName.trim() || !currentOrganId) return
    await createReasoningPath({ name: pathName.trim(), organId: currentOrganId })
    setPathName('')
  }

  // Evidence form
  const [evForm, setEvForm] = useState<{
    targetType: 'REASONING_PATH' | 'HYPEREDGE'
    targetId: string
    sourceTitle: string
    url: string
    notes: string
    confidence: 'Low' | 'Medium' | 'High'
    confidenceExplanation: string
  }>({
    targetType: 'REASONING_PATH',
    targetId: '',
    sourceTitle: '',
    url: '',
    notes: '',
    confidence: 'Medium',
    confidenceExplanation: '',
  })

  const handleCreateEvidence = async () => {
    if (!evForm.targetId || !evForm.sourceTitle.trim()) return
    await createEvidence(evForm)
    setEvForm({ targetType: 'REASONING_PATH', targetId: '', sourceTitle: '', url: '', notes: '', confidence: 'Medium', confidenceExplanation: '' })
  }

  // Filter relationships by lens
  const filteredRelationships = relationships.filter(r =>
    activeLens === 'general-info' || r.lens.toLowerCase() === activeLens.replace('-', '_')
  )

  const tabLabels: Record<string, string> = {
    nodes: 'Nodes',
    relationships: 'Relationships',
    hyperedges: 'Hyper Edges',
    evidence: 'Evidence',
  }

  return (
    <div className="knowledge-panel">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {(['nodes', 'relationships', 'hyperedges', 'evidence'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto" style={{ height: 200 }}>
        {/* NODES TAB */}
        {tab === 'nodes' && (
          <div className="p-2">
            {nodes.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {nodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-[var(--surface-hover)] ${
                      selectedNodeId === node.id ? 'bg-blue-50 text-[var(--accent)]' : ''
                    }`}
                  >
                    <span className="font-medium">{node.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-1">
                      ({layers.find(l => l.id === node.layerId)?.name || '?'})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RELATIONSHIPS TAB */}
        {tab === 'relationships' && (
          <div className="p-2">
            {filteredRelationships.length === 0 ? (
              <p className="empty-state py-2 text-xs">Connect two concept nodes to describe how they relate.</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {filteredRelationships.map(rel => {
                  const src = nodes.find(n => n.id === rel.sourceNodeId)
                  const tgt = nodes.find(n => n.id === rel.targetNodeId)
                  return (
                    <div key={rel.id} className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[var(--surface-hover)]">
                      <span className="font-medium">{src?.title || '?'}</span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span className="font-medium">{tgt?.title || '?'}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">({rel.type})</span>
                      <button onClick={() => deleteRelationship(rel.id)} className="ml-auto text-[10px] text-[var(--danger)] hover:underline">Del</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Create relationship form */}
            <div className="mt-2 pt-2 border-t border-[var(--border)]">
              <p className="text-xs font-medium mb-1">New Relationship</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <select value={relForm.sourceNodeId} onChange={e => setRelForm({ ...relForm, sourceNodeId: e.target.value })} className="px-1 py-0.5 border border-[var(--border)] rounded">
                  <option value="">Source node</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
                <select value={relForm.targetNodeId} onChange={e => setRelForm({ ...relForm, targetNodeId: e.target.value })} className="px-1 py-0.5 border border-[var(--border)] rounded">
                  <option value="">Target node</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
              </div>
              <div className="flex gap-1 mt-1">
                <select value={relForm.type} onChange={e => setRelForm({ ...relForm, type: e.target.value })} className="flex-1 px-1 py-0.5 border border-[var(--border)] rounded text-xs">
                  <option value="PART_OF">Part Of</option>
                  <option value="CONTAINS">Contains</option>
                  <option value="ADJACENT_TO">Adjacent To</option>
                  <option value="FLOWS_TO">Flows To</option>
                  <option value="DRAINS_TO">Drains To</option>
                  <option value="SUPPLIES">Supplies</option>
                  <option value="INNERVATES">Innervates</option>
                  <option value="CAUSES">Causes</option>
                  <option value="LEADS_TO">Leads To</option>
                  <option value="RESULTS_IN">Results In</option>
                  <option value="PREVENTS">Prevents</option>
                  <option value="MECHANISM_OF">Mechanism Of</option>
                  <option value="EXPLAINS">Explains</option>
                  <option value="EVOLVES_TO">Evolves To</option>
                  <option value="WORSENS_TO">Worsens To</option>
                  <option value="IMPROVES_TO">Improves To</option>
                </select>
                <button onClick={handleCreateRelationship} className="px-2 py-0.5 bg-[var(--accent)] text-white rounded text-xs">Add</button>
              </div>
            </div>
          </div>
        )}

        {/* HYPER EDGES TAB (formerly Paths) */}
        {tab === 'hyperedges' && (
          <div className="p-2">
            {reasoningPaths.length === 0 ? (
              <p className="empty-state py-2 text-xs">Create an ordered hyper edge path to connect concept node steps.</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {reasoningPaths.map(path => (
                  <div key={path.id} className="p-2 border border-[var(--border)] rounded text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{path.name}</span>
                      <button onClick={() => deleteReasoningPath(path.id)} className="text-[10px] text-[var(--danger)] hover:underline">Del</button>
                    </div>
                    {path.description && <p className="text-[10px] text-[var(--text-muted)]">{path.description}</p>}
                    {path.steps && path.steps.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {path.steps.map((step, i) => (
                          <div key={step.id} className="space-y-0.5 border-b border-dotted border-[var(--border)] pb-1 last:border-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[var(--text-muted)] font-semibold">{i + 1}.</span>
                              <span className="font-medium">{nodes.find(n => n.id === step.nodeId)?.title || '?'}</span>
                              <button onClick={() => removePathStep(step.id, path.id)} className="ml-auto text-[10px] text-[var(--danger)]">×</button>
                            </div>
                            <input
                              type="text"
                              placeholder="Step note / text between step..."
                              defaultValue={step.explanation || ''}
                              onBlur={async (e) => {
                                const val = e.target.value
                                if (val !== (step.explanation || '')) {
                                  await fetch(`/api/reasoning-paths/${path.id}/steps`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ stepId: step.id, explanation: val })
                                  })
                                }
                              }}
                              className="w-full text-[10px] px-1.5 py-0.5 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--foreground)]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1 mt-1.5">
                      <select
                        onChange={async (e) => {
                          const nodeId = e.target.value
                          if (nodeId) {
                            const currentOrder = path.steps?.length || 0
                            await addPathStep(path.id, nodeId, currentOrder)
                            e.target.value = ''
                          }
                        }}
                        className="flex-1 px-1 py-0.5 border border-[var(--border)] rounded text-[10px]"
                      >
                        <option value="">+ Add node step...</option>
                        {nodes.filter(n => !path.steps?.find(s => s.nodeId === n.id)).map(n => (
                          <option key={n.id} value={n.id}>{n.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-1">
              <input type="text" value={pathName} onChange={e => setPathName(e.target.value)} placeholder="New Hyper Edge name" className="flex-1 px-2 py-0.5 border border-[var(--border)] rounded text-xs" />
              <button onClick={handleCreatePath} className="px-2 py-0.5 bg-[var(--accent)] text-white rounded text-xs">Create</button>
            </div>
          </div>
        )}

        {/* EVIDENCE TAB */}
        {tab === 'evidence' && (
          <div className="p-2">
            {evidence.length === 0 && (
              <p className="empty-state py-2 text-xs">Add evidence to hyper edges.</p>
            )}
            <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
              {evidence.map(ev => (
                <div key={ev.id} className="p-2 border border-[var(--border)] rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ev.sourceTitle}</span>
                    <button onClick={() => deleteEvidence(ev.id)} className="text-[10px] text-[var(--danger)]">×</button>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Target: {ev.targetId.slice(0, 8)}...
                    <span className={`ml-1 font-medium ${
                      ev.confidence === 'High' ? 'text-[var(--success)]' : ev.confidence === 'Medium' ? 'text-[var(--warning)]' : 'text-[var(--danger)]'
                    }`}>
                      {ev.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[var(--border)]">
              <p className="text-xs font-medium mb-1">Add Evidence</p>
              <div className="space-y-1 text-xs">
                <select value={evForm.targetId} onChange={e => setEvForm({ ...evForm, targetId: e.target.value })}
                  className="w-full px-1 py-0.5 border border-[var(--border)] rounded">
                  <option value="">Select target Hyper Edge...</option>
                  {reasoningPaths.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="text" value={evForm.sourceTitle} onChange={e => setEvForm({ ...evForm, sourceTitle: e.target.value })}
                  placeholder="Source title / citation" className="w-full px-1 py-0.5 border border-[var(--border)] rounded" />
                <input type="text" value={evForm.url} onChange={e => setEvForm({ ...evForm, url: e.target.value })}
                  placeholder="URL (optional)" className="w-full px-1 py-0.5 border border-[var(--border)] rounded" />
                <textarea value={evForm.notes} onChange={e => setEvForm({ ...evForm, notes: e.target.value })}
                  placeholder="Notes (optional)" className="w-full px-1 py-0.5 border border-[var(--border)] rounded" rows={2} />
                <div className="flex gap-1">
                  <select value={evForm.confidence} onChange={e => setEvForm({ ...evForm, confidence: e.target.value as 'Low' | 'Medium' | 'High' })}
                    className="flex-1 px-1 py-0.5 border border-[var(--border)] rounded">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  <button onClick={handleCreateEvidence} className="px-2 py-0.5 bg-[var(--accent)] text-white rounded">Add</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
