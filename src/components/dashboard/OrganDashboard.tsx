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
    <div className="min-h-screen bg-[#F6F9FA] text-[#0F172A]">
      {/* Sleek Navigation Header */}
      <header className="border-b border-[#E2E8F0] bg-white px-8 py-4 shadow-xs flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#219EBC] to-[#1A86A1] flex items-center justify-center text-white text-xl font-black shadow-md shadow-[#219EBC]/20">
            A
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0F172A] flex items-center gap-2">
              Atlas
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EBF7FA] text-[#219EBC] border border-[#B6E5F0]">
                MVP
              </span>
            </h1>
            <p className="text-xs font-medium text-[#5A6E7F]">Medical Mental Model Authoring Platform</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-5 py-2.5 bg-[#FB8A0A] hover:bg-[#DF7500] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#FB8A0A]/25 hover:shadow-lg hover:shadow-[#FB8A0A]/30 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <span className="text-lg leading-none">+</span> Create Organ
        </button>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-4xl mx-auto p-6 md:p-8">
        {/* Create Form Container */}
        {showCreate && (
          <div className="mb-8 p-6 border border-[#B6E5F0] rounded-2xl bg-white shadow-xl shadow-[#219EBC]/5 transition-all">
            <h2 className="text-base font-bold text-[#0F172A] mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FB8A0A]" />
              Create New Organ Model
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Organ name (e.g. Heart, Brain, Kidney)"
                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#219EBC] focus:ring-3 focus:ring-[#219EBC]/15 transition-all bg-[#F6F9FA]"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Optional description or anatomical notes"
                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm resize-none focus:outline-none focus:border-[#219EBC] focus:ring-3 focus:ring-[#219EBC]/15 transition-all bg-[#F6F9FA]"
                rows={2}
              />
              <div className="flex gap-2 pt-1 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border border-[#E2E8F0] hover:bg-[#F0F5F8] text-[#5A6E7F] rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-5 py-2 bg-[#219EBC] hover:bg-[#1A86A1] text-white rounded-xl text-xs font-semibold shadow-md shadow-[#219EBC]/20 transition-all cursor-pointer"
                >
                  Create Model
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {organs.length === 0 && !showCreate && (
          <div className="empty-state py-24 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#EBF7FA] text-[#219EBC] flex items-center justify-center text-3xl mb-3 shadow-xs">
              🫀
            </div>
            <p className="text-xl font-bold text-[#0F172A]">No Organ Models Yet</p>
            <p className="text-sm text-[#5A6E7F] max-w-sm">Create your first organ map to start modeling visual anatomical layers and clinical reasoning.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2.5 bg-[#219EBC] hover:bg-[#1A86A1] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#219EBC]/20 transition-all cursor-pointer"
            >
              + Create First Organ
            </button>
          </div>
        )}

        {/* Organ Card Grid */}
        <div className="grid gap-3.5">
          {organs.map(organ => (
            <div
              key={organ.id}
              className="group flex items-center gap-4 p-5 border border-[#E2E8F0] rounded-2xl bg-white hover:border-[#219EBC] hover:shadow-md hover:shadow-[#219EBC]/5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EBF7FA] text-[#219EBC] group-hover:bg-[#219EBC] group-hover:text-white transition-colors flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                🫀
              </div>
              <div className="flex-1 min-w-0">
                {renaming === organ.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-[#219EBC] rounded-lg text-sm focus:outline-none bg-white"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleRename(organ.id)}
                    />
                    <button onClick={() => handleRename(organ.id)} className="px-3 py-1.5 bg-[#219EBC] text-white rounded-lg text-xs font-semibold">Save</button>
                    <button onClick={() => setRenaming(null)} className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs text-[#5A6E7F]">Cancel</button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => router.push(`/organs/${organ.id}`)}
                      className="text-base font-bold text-[#0F172A] hover:text-[#219EBC] text-left transition-colors truncate block"
                    >
                      {organ.name}
                    </button>
                    {organ.description && (
                      <p className="text-xs text-[#5A6E7F] truncate mt-0.5">{organ.description}</p>
                    )}
                  </>
                )}
              </div>
              <div className="text-[11px] font-medium text-[#5A6E7F] bg-[#F6F9FA] px-2.5 py-1 rounded-lg border border-[#E2E8F0] whitespace-nowrap">
                {new Date(organ.updatedAt).toLocaleDateString()}
              </div>
              <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setRenaming(organ.id); setRenameValue(organ.name) }}
                  className="px-2.5 py-1.5 text-xs border border-[#E2E8F0] rounded-lg hover:bg-[#EBF7FA] hover:text-[#219EBC] hover:border-[#B6E5F0] transition-colors"
                  title="Rename"
                >
                  ✏️
                </button>
                {deleting === organ.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(organ.id)} className="px-2.5 py-1.5 text-xs bg-[#EF4444] text-white rounded-lg font-semibold">
                      Confirm
                    </button>
                    <button onClick={() => setDeleting(null)} className="px-2.5 py-1.5 text-xs border border-[#E2E8F0] rounded-lg">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleting(organ.id)}
                    className="px-2.5 py-1.5 text-xs border border-[#E2E8F0] rounded-lg hover:bg-[#FFF5E8] hover:text-[#EF4444] hover:border-[#FFD4A3] transition-colors"
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
