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
    <div className="knowledge-panel bg-white">
      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] px-2 bg-[#F6F9FA]">
        {(['nodes', 'relationships', 'hyperedges', 'evidence'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs transition-all border-b-2 cursor-pointer ${
              tab === t
                ? 'border-[#219EBC] text-[#219EBC] font-bold bg-white'
                : 'border-transparent text-[#5A6E7F] hover:text-[#0F172A] hover:bg-white/50'
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
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {nodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      selectedNodeId === node.id
                        ? 'bg-[#EBF7FA] text-[#219EBC] font-bold border border-[#B6E5F0]'
                        : 'hover:bg-[#F0F5F8] text-[#0F172A]'
                    }`}
                  >
                    <span className="truncate">{node.title}</span>
                    <span className="text-[10px] text-[#5A6E7F] font-normal ml-2 shrink-0">
                      {layers.find(l => l.id === node.layerId)?.name || '?'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state py-4 text-xs">No concept nodes created yet.</p>
            )}
          </div>
        )}

        {/* RELATIONSHIPS TAB */}
        {tab === 'relationships' && (
          <div className="p-3">
            {filteredRelationships.length === 0 ? (
              <p className="empty-state py-3 text-xs">Connect two concept nodes to describe how they relate.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {filteredRelationships.map(rel => {
                  const src = nodes.find(n => n.id === rel.sourceNodeId)
                  const tgt = nodes.find(n => n.id === rel.targetNodeId)
                  return (
                    <div key={rel.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs hover:border-[#B6E5F0]">
                      <span className="font-semibold text-[#0F172A]">{src?.title || '?'}</span>
                      <span className="text-[#219EBC] font-bold">→</span>
                      <span className="font-semibold text-[#0F172A]">{tgt?.title || '?'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#F6F9FA] text-[#5A6E7F] font-mono border border-[#E2E8F0]">({rel.type})</span>
                      <button onClick={() => deleteRelationship(rel.id)} className="ml-auto text-[10px] text-red-500 hover:underline cursor-pointer">Del</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Create relationship form */}
            <div className="mt-3 pt-2.5 border-t border-[#E2E8F0]">
              <p className="text-xs font-bold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#219EBC]" />
                New Relationship
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <select value={relForm.sourceNodeId} onChange={e => setRelForm({ ...relForm, sourceNodeId: e.target.value })} className="px-2 py-1 border border-[#E2E8F0] rounded-lg bg-white">
                  <option value="">Source node</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
                <select value={relForm.targetNodeId} onChange={e => setRelForm({ ...relForm, targetNodeId: e.target.value })} className="px-2 py-1 border border-[#E2E8F0] rounded-lg bg-white">
                  <option value="">Target node</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <select value={relForm.type} onChange={e => setRelForm({ ...relForm, type: e.target.value })} className="flex-1 px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs bg-white">
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
                <button onClick={handleCreateRelationship} className="px-3 py-1 bg-[#219EBC] hover:bg-[#1A86A1] text-white rounded-lg text-xs font-semibold cursor-pointer">Add</button>
              </div>
            </div>
          </div>
        )}

        {/* HYPER EDGES TAB (formerly Paths) */}
        {tab === 'hyperedges' && (
          <div className="p-3">
            {reasoningPaths.length === 0 ? (
              <p className="empty-state py-3 text-xs">Create an ordered hyper edge path to connect concept node steps.</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {reasoningPaths.map(path => (
                  <div key={path.id} className="p-2.5 border border-[#E2E8F0] rounded-xl bg-white text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FB8A0A]" />
                        {path.name}
                      </span>
                      <button onClick={() => deleteReasoningPath(path.id)} className="text-[10px] text-red-500 hover:underline cursor-pointer">Del</button>
                    </div>
                    {path.description && <p className="text-[10px] text-[#5A6E7F]">{path.description}</p>}
                    {path.steps && path.steps.length > 0 && (
                      <div className="mt-1 space-y-1.5 pt-1 border-t border-[#F0F5F8]">
                        {path.steps.map((step, i) => (
                          <div key={step.id} className="space-y-1 pb-1 border-b border-dashed border-[#E2E8F0] last:border-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-[#FB8A0A] text-white font-extrabold text-[9px] flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <span className="font-semibold text-[#0F172A]">{nodes.find(n => n.id === step.nodeId)?.title || '?'}</span>
                              <button onClick={() => removePathStep(step.id, path.id)} className="ml-auto text-[10px] text-red-500 font-bold cursor-pointer">×</button>
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
                              className="w-full text-[10px] px-2 py-0.5 border border-[#E2E8F0] rounded-md bg-[#F6F9FA] text-[#0F172A] focus:outline-none focus:border-[#219EBC]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-1.5">
                      <select
                        onChange={async (e) => {
                          const nodeId = e.target.value
                          if (nodeId) {
                            const currentOrder = path.steps?.length || 0
                            await addPathStep(path.id, nodeId, currentOrder)
                            e.target.value = ''
                          }
                        }}
                        className="flex-1 px-2 py-1 border border-[#E2E8F0] rounded-lg text-[10px] bg-white"
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
            <div className="mt-2.5 flex gap-1.5">
              <input type="text" value={pathName} onChange={e => setPathName(e.target.value)} placeholder="New Hyper Edge name" className="flex-1 px-2.5 py-1 border border-[#E2E8F0] rounded-lg text-xs bg-white" />
              <button onClick={handleCreatePath} className="px-3 py-1 bg-[#FB8A0A] hover:bg-[#DF7500] text-white rounded-lg text-xs font-semibold cursor-pointer">Create</button>
            </div>
          </div>
        )}

        {/* EVIDENCE TAB */}
        {tab === 'evidence' && (
          <div className="p-3">
            {evidence.length === 0 && (
              <p className="empty-state py-3 text-xs">Add evidence to hyper edges.</p>
            )}
            <div className="space-y-2 max-h-32 overflow-y-auto mb-2 pr-1">
              {evidence.map(ev => (
                <div key={ev.id} className="p-2.5 border border-[#E2E8F0] rounded-xl bg-white text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A]">{ev.sourceTitle}</span>
                    <button onClick={() => deleteEvidence(ev.id)} className="text-[10px] text-red-500 font-bold cursor-pointer">×</button>
                  </div>
                  <div className="text-[10px] text-[#5A6E7F] mt-0.5">
                    Target: {ev.targetId.slice(0, 8)}...
                    <span className={`ml-1.5 px-1.5 py-0.2 rounded-full font-bold text-[9px] ${
                      ev.confidence === 'High' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : ev.confidence === 'Medium' ? 'bg-[#FFF5E8] text-[#FB8A0A] border border-[#FFD4A3]' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {ev.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2.5 border-t border-[#E2E8F0]">
              <p className="text-xs font-bold text-[#0F172A] mb-1.5">Add Evidence</p>
              <div className="space-y-1.5 text-xs">
                <select value={evForm.targetId} onChange={e => setEvForm({ ...evForm, targetId: e.target.value })}
                  className="w-full px-2 py-1 border border-[#E2E8F0] rounded-lg bg-white">
                  <option value="">Select target Hyper Edge...</option>
                  {reasoningPaths.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="text" value={evForm.sourceTitle} onChange={e => setEvForm({ ...evForm, sourceTitle: e.target.value })}
                  placeholder="Source title / citation" className="w-full px-2 py-1 border border-[#E2E8F0] rounded-lg bg-white" />
                <input type="text" value={evForm.url} onChange={e => setEvForm({ ...evForm, url: e.target.value })}
                  placeholder="URL (optional)" className="w-full px-2 py-1 border border-[#E2E8F0] rounded-lg bg-white" />
                <textarea value={evForm.notes} onChange={e => setEvForm({ ...evForm, notes: e.target.value })}
                  placeholder="Notes (optional)" className="w-full px-2 py-1 border border-[#E2E8F0] rounded-lg bg-white resize-none" rows={2} />
                <div className="flex gap-1.5">
                  <select value={evForm.confidence} onChange={e => setEvForm({ ...evForm, confidence: e.target.value as 'Low' | 'Medium' | 'High' })}
                    className="flex-1 px-2 py-1 border border-[#E2E8F0] rounded-lg bg-white">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  <button onClick={handleCreateEvidence} className="px-3 py-1 bg-[#219EBC] text-white rounded-lg font-semibold cursor-pointer">Add</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
