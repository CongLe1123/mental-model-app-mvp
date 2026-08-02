'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function OrganDashboard() {
  const { organs, loadOrgans, createOrgan, renameOrgan, deleteOrgan } = useStore()
  const router = useRouter()
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => { loadOrgans() }, [loadOrgans])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const organ = await createOrgan(newName.trim(), newDesc.trim())
    if (organ) {
      toast.success('Organ created')
      setNewName('')
      setNewDesc('')
      setShowCreate(false)
      router.push(`/organs/${organ.id}`)
    } else {
      toast.error('Failed to create organ')
    }
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return
    await renameOrgan(id, renameValue.trim())
    toast.success('Renamed')
    setRenaming(null)
  }

  const handleDelete = async (id: string) => {
    await deleteOrgan(id)
    toast.success('Deleted')
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-black">
      {/* Neo-Brutalist Header */}
      <header className="border-b-3 border-black bg-white px-6 md:px-8 py-4 sticky top-0 z-20 flex items-center justify-between shadow-[0_4px_0_0_#000]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[var(--primary)] border-2 border-black flex items-center justify-center text-black text-2xl font-black shadow-[3px_3px_0px_#000]">
            A
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-black flex items-center gap-2">
              ATLAS
              <span className="neo-badge bg-[var(--secondary)]">
                MVP
              </span>
            </h1>
            <p className="text-xs font-bold text-[#333333]">Medical Mental Model Authoring Platform</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="neo-btn neo-btn-primary px-5 py-2.5 text-sm"
        >
          <span className="text-lg leading-none mr-1">+</span> CREATE ORGAN
        </button>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        {/* Create Form Container */}
        {showCreate && (
          <div className="neo-container p-6 bg-white space-y-4">
            <h2 className="text-base font-black text-black flex items-center gap-2">
              <span className="w-3 h-3 border border-black bg-[var(--accent)]" />
              CREATE NEW ORGAN MODEL
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Organ name (e.g. Heart, Brain, Kidney)"
                className="neo-input w-full px-4 py-2.5 text-sm"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Optional description or anatomical notes"
                className="neo-input w-full px-4 py-2.5 text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2 pt-1 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="neo-btn neo-btn-white px-4 py-2 text-xs"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCreate}
                  className="neo-btn neo-btn-secondary px-5 py-2 text-xs"
                >
                  CREATE MODEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {organs.length === 0 && !showCreate && (
          <div className="neo-container py-20 bg-white text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-[var(--primary)] border-2 border-black text-black flex items-center justify-center text-3xl font-black shadow-[4px_4px_0px_#000]">
              🫀
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">NO ORGAN MODELS YET</h2>
            <p className="text-sm font-semibold text-[#333333] max-w-sm mx-auto">
              Create your first organ map to start modeling visual anatomical layers and clinical reasoning.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="neo-btn neo-btn-primary px-6 py-3 text-sm font-black"
            >
              + CREATE FIRST ORGAN
            </button>
          </div>
        )}

        {/* Organ Card Grid */}
        <div className="grid gap-4">
          {organs.map(organ => (
            <div
              key={organ.id}
              className="neo-card-interactive p-5 flex flex-col md:flex-row md:items-center gap-4 bg-white"
            >
              <div className="w-12 h-12 bg-[var(--primary)] border-2 border-black text-black font-black text-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                🫀
              </div>
              <div className="flex-1 min-w-0">
                {renaming === organ.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      className="neo-input flex-1 px-3 py-1.5 text-sm"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleRename(organ.id)}
                    />
                    <button onClick={() => handleRename(organ.id)} className="neo-btn neo-btn-secondary px-3 py-1.5 text-xs">SAVE</button>
                    <button onClick={() => setRenaming(null)} className="neo-btn neo-btn-white px-3 py-1.5 text-xs">CANCEL</button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => router.push(`/organs/${organ.id}`)}
                      className="text-lg font-black text-black hover:bg-[var(--primary)] px-1 -ml-1 transition-colors text-left truncate block"
                    >
                      {organ.name}
                    </button>
                    {organ.description && (
                      <p className="text-xs font-semibold text-[#444444] truncate mt-0.5">{organ.description}</p>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="neo-badge bg-[var(--surface-alt)] font-mono">
                  {new Date(organ.updatedAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setRenaming(organ.id); setRenameValue(organ.name) }}
                    className="neo-btn neo-btn-white px-3 py-1.5 text-xs"
                    title="Rename"
                  >
                    ✏️ Edit
                  </button>
                  {deleting === organ.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(organ.id)} className="neo-btn neo-btn-danger px-3 py-1.5 text-xs">
                        CONFIRM
                      </button>
                      <button onClick={() => setDeleting(null)} className="neo-btn neo-btn-white px-3 py-1.5 text-xs">
                        CANCEL
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleting(organ.id)}
                      className="neo-btn neo-btn-white px-3 py-1.5 text-xs hover:bg-[var(--danger-light)] hover:text-[var(--danger)]"
                      title="Delete"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
