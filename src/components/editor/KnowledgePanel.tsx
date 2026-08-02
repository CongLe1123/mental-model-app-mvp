'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'

export default function KnowledgePanel() {
  const {
    nodes, layers, relationships, reasoningPaths, evidence,
    selectedNodeId, setSelectedNodeId,
    activeLens,
    createRelationship, deleteRelationship,
    createReasoningPath, deleteReasoningPath,
    addPathStep, removePathStep,
    createEvidence, deleteEvidence,
    currentOrganId,
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
    nodes: 'NODES',
    relationships: 'RELATIONSHIPS',
    hyperedges: 'HYPER EDGES',
    evidence: 'EVIDENCE',
  }

  return (
    <div className="knowledge-panel bg-white border-t-2.5 border-black">
      {/* Tabs Bar */}
      <div className="flex border-b-2.5 border-black px-2 bg-[var(--surface-alt)] gap-1 pt-1.5">
        {(['nodes', 'relationships', 'hyperedges', 'evidence'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-black transition-all cursor-pointer border-t-2 border-x-2 border-black ${
              tab === t
                ? 'bg-[var(--primary)] text-black shadow-[2px_-2px_0px_#000] -mb-[2.5px] pb-2.5 z-10'
                : 'bg-white text-black hover:bg-[var(--primary-light)]'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto" style={{ height: 200 }}>
        {/* NODES TAB */}
        {tab === 'nodes' && (
          <div className="p-3">
            {nodes.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {nodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full text-left px-3 py-2 border-2 border-black text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      selectedNodeId === node.id
                        ? 'bg-[var(--secondary-light)] text-black font-black shadow-[3px_3px_0px_#000]'
                        : 'bg-white hover:bg-[var(--surface-alt)] text-black shadow-[2px_2px_0px_#000]'
                    }`}
                  >
                    <span className="truncate">{node.title}</span>
                    <span className="neo-badge bg-white text-black ml-2 shrink-0">
                      {layers.find(l => l.id === node.layerId)?.name || '?'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state py-4 text-xs font-bold">No concept nodes created yet.</p>
            )}
          </div>
        )}

        {/* RELATIONSHIPS TAB */}
        {tab === 'relationships' && (
          <div className="p-3 space-y-3">
            {filteredRelationships.length === 0 ? (
              <p className="empty-state py-3 text-xs font-bold">Connect two concept nodes to describe how they relate.</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {filteredRelationships.map(rel => {
                  const src = nodes.find(n => n.id === rel.sourceNodeId)
                  const tgt = nodes.find(n => n.id === rel.targetNodeId)
                  return (
                    <div key={rel.id} className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-white text-xs font-bold shadow-[2px_2px_0px_#000]">
                      <span className="font-black text-black">{src?.title || '?'}</span>
                      <span className="font-black text-black bg-[var(--primary)] px-1 border border-black">→</span>
                      <span className="font-black text-black">{tgt?.title || '?'}</span>
                      <span className="neo-badge bg-[var(--surface-alt)] font-mono">({rel.type})</span>
                      <button onClick={() => deleteRelationship(rel.id)} className="ml-auto neo-btn neo-btn-danger px-2 py-0.5 text-[10px]">DEL</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Create relationship form */}
            <div className="pt-2.5 border-t-2 border-black space-y-2">
              <p className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <span className="w-2 h-2 border border-black bg-[var(--primary)]" />
                NEW RELATIONSHIP
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select value={relForm.sourceNodeId} onChange={e => setRelForm({ ...relForm, sourceNodeId: e.target.value })} className="neo-input px-2.5 py-1.5 text-xs font-bold">
                  <option value="">Source node</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
                <select value={relForm.targetNodeId} onChange={e => setRelForm({ ...relForm, targetNodeId: e.target.value })} className="neo-input px-2.5 py-1.5 text-xs font-bold">
                  <option value="">Target node</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <select value={relForm.type} onChange={e => setRelForm({ ...relForm, type: e.target.value })} className="flex-1 neo-input px-2.5 py-1.5 text-xs font-bold">
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
                <button onClick={handleCreateRelationship} className="neo-btn neo-btn-primary px-4 py-1.5 text-xs font-black">ADD</button>
              </div>
            </div>
          </div>
        )}

        {/* HYPER EDGES TAB */}
        {tab === 'hyperedges' && (
          <div className="p-3 space-y-3">
            {reasoningPaths.length === 0 ? (
              <p className="empty-state py-3 text-xs font-bold">Create an ordered hyper edge path to connect concept node steps.</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {reasoningPaths.map(path => (
                  <div key={path.id} className="p-3 border-2 border-black bg-white text-xs space-y-2 shadow-[2px_2px_0px_#000]">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-black uppercase flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 border border-black bg-[var(--accent)]" />
                        {path.name}
                      </span>
                      <button onClick={() => deleteReasoningPath(path.id)} className="neo-btn neo-btn-danger px-2 py-0.5 text-[10px]">DEL</button>
                    </div>
                    {path.description && <p className="text-xs font-semibold text-[#444444]">{path.description}</p>}
                    {path.steps && path.steps.length > 0 && (
                      <div className="mt-2 space-y-2 pt-2 border-t-2 border-black">
                        {path.steps.map((step, i) => (
                          <div key={step.id} className="space-y-1 pb-1 border-b border-black last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 border border-black bg-[var(--accent)] text-black font-black text-xs flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000]">
                                {i + 1}
                              </span>
                              <span className="font-black text-black">{nodes.find(n => n.id === step.nodeId)?.title || '?'}</span>
                              <button onClick={() => removePathStep(step.id, path.id)} className="ml-auto neo-btn neo-btn-danger px-1.5 py-0.2 text-[10px]">×</button>
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
                              className="neo-input w-full text-[11px] px-2 py-1 bg-[#FFFDF5]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <select
                        onChange={async (e) => {
                          const nodeId = e.target.value
                          if (nodeId) {
                            const currentOrder = path.steps?.length || 0
                            await addPathStep(path.id, nodeId, currentOrder)
                            e.target.value = ''
                          }
                        }}
                        className="neo-input flex-1 px-2.5 py-1 text-xs font-bold"
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
            <div className="pt-2 border-t-2 border-black flex gap-2">
              <input type="text" value={pathName} onChange={e => setPathName(e.target.value)} placeholder="New Hyper Edge name" className="neo-input flex-1 px-3 py-1.5 text-xs" />
              <button onClick={handleCreatePath} className="neo-btn neo-btn-accent px-4 py-1.5 text-xs font-black">CREATE</button>
            </div>
          </div>
        )}

        {/* EVIDENCE TAB */}
        {tab === 'evidence' && (
          <div className="p-3 space-y-3">
            {evidence.length === 0 && (
              <p className="empty-state py-3 text-xs font-bold">Add evidence to hyper edges.</p>
            )}
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {evidence.map(ev => (
                <div key={ev.id} className="p-3 border-2 border-black bg-white text-xs font-bold shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-black">{ev.sourceTitle}</span>
                    <button onClick={() => deleteEvidence(ev.id)} className="neo-btn neo-btn-danger px-1.5 py-0.5 text-[10px]">×</button>
                  </div>
                  <div className="text-xs font-bold text-black mt-1 flex items-center justify-between">
                    <span>Target: {ev.targetId.slice(0, 8)}...</span>
                    <span className={`neo-badge ${
                      ev.confidence === 'High' ? 'bg-[var(--lime)] text-black' : ev.confidence === 'Medium' ? 'bg-[var(--primary)] text-black' : 'bg-[var(--danger-light)] text-[var(--danger)]'
                    }`}>
                      {ev.confidence} CONFIDENCE
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2.5 border-t-2 border-black space-y-2">
              <p className="text-xs font-black uppercase text-black">ADD EVIDENCE</p>
              <div className="space-y-2 text-xs">
                <select value={evForm.targetId} onChange={e => setEvForm({ ...evForm, targetId: e.target.value })}
                  className="neo-input w-full px-2.5 py-1.5 text-xs font-bold">
                  <option value="">Select target Hyper Edge...</option>
                  {reasoningPaths.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="text" value={evForm.sourceTitle} onChange={e => setEvForm({ ...evForm, sourceTitle: e.target.value })}
                  placeholder="Source title / citation" className="neo-input w-full px-2.5 py-1.5 text-xs" />
                <input type="text" value={evForm.url} onChange={e => setEvForm({ ...evForm, url: e.target.value })}
                  placeholder="URL (optional)" className="neo-input w-full px-2.5 py-1.5 text-xs" />
                <textarea value={evForm.notes} onChange={e => setEvForm({ ...evForm, notes: e.target.value })}
                  placeholder="Notes (optional)" className="neo-input w-full px-2.5 py-1.5 text-xs resize-none" rows={2} />
                <div className="flex gap-2">
                  <select value={evForm.confidence} onChange={e => setEvForm({ ...evForm, confidence: e.target.value as 'Low' | 'Medium' | 'High' })}
                    className="flex-1 neo-input px-2.5 py-1.5 text-xs font-bold">
                    <option value="Low">Low Confidence</option>
                    <option value="Medium">Medium Confidence</option>
                    <option value="High">High Confidence</option>
                  </select>
                  <button onClick={handleCreateEvidence} className="neo-btn neo-btn-primary px-4 py-1.5 text-xs font-black">ADD</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
