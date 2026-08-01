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
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Atlas</h1>
          <p className="text-sm text-[var(--text-muted)]">Medical Knowledge Map Authoring</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-hover)] text-sm font-medium"
        >
          + Create Organ
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {showCreate && (
          <div className="mb-8 p-4 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
            <h2 className="font-medium mb-3">Create New Organ</h2>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Organ name (e.g. Heart)"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md mb-2 text-sm"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md mb-3 text-sm resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="px-4 py-1.5 bg-[var(--accent)] text-white rounded-md text-sm">
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 border border-[var(--border)] rounded-md text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {organs.length === 0 && !showCreate && (
          <div className="empty-state py-20">
            <div className="text-4xl mb-2">🫀</div>
            <p className="text-lg font-medium">No organs yet</p>
            <p className="text-sm">Create your first organ to begin building a visual mental model.</p>
          </div>
        )}

        <div className="grid gap-3">
          {organs.map(organ => (
            <div key={organ.id} className="flex items-center gap-4 p-4 border border-[var(--border)] rounded-lg bg-[var(--surface)] hover:border-[var(--accent)] transition-colors">
              <div className="flex-1 min-w-0">
                {renaming === organ.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      className="flex-1 px-2 py-1 border border-[var(--border)] rounded text-sm"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleRename(organ.id)}
                    />
                    <button onClick={() => handleRename(organ.id)} className="px-3 py-1 bg-[var(--accent)] text-white rounded text-xs">Save</button>
                    <button onClick={() => setRenaming(null)} className="px-3 py-1 border rounded text-xs">Cancel</button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => router.push(`/organs/${organ.id}`)}
                      className="text-base font-medium hover:text-[var(--accent)] text-left"
                    >
                      {organ.name}
                    </button>
                    {organ.description && (
                      <p className="text-sm text-[var(--text-muted)] truncate">{organ.description}</p>
                    )}
                  </>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                {new Date(organ.updatedAt).toLocaleDateString()}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setRenaming(organ.id); setRenameValue(organ.name) }}
                  className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-[var(--surface-hover)]"
                  title="Rename"
                >
                  ✏️
                </button>
                {deleting === organ.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(organ.id)} className="px-2 py-1 text-xs bg-[var(--danger)] text-white rounded">
                      Confirm
                    </button>
                    <button onClick={() => setDeleting(null)} className="px-2 py-1 text-xs border rounded">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleting(organ.id)}
                    className="px-2 py-1 text-xs border border-[var(--border)] rounded hover:bg-red-50"
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
