import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const organData = body.organ || body
    if (!organData || !organData.name) {
      return NextResponse.json({ error: 'Invalid JSON format: organ.name is required' }, { status: 400 })
    }

    const layersData: any[] = body.layers || []
    const nodesData: any[] = body.nodes || []
    const annotationsData: any[] = body.annotations || []
    const relationshipsData: any[] = body.relationships || []
    const reasoningPathsData: any[] = body.reasoningPaths || []
    const hyperedgesData: any[] = body.hyperedges || []
    const evidenceData: any[] = body.evidence || []

    // ID Mappings to cleanly rewire imported models
    const layerIdMap = new Map<string, string>()
    const nodeIdMap = new Map<string, string>()
    const pathIdMap = new Map<string, string>()
    const hyperedgeIdMap = new Map<string, string>()

    // Run creation in a Prisma transaction
    const resultOrgan = await prisma.$transaction(async (tx) => {
      // 1. Create Organ
      const organ = await tx.organ.create({
        data: {
          name: organData.name,
          description: organData.description || '',
          thumbnail: organData.thumbnail || '',
        },
      })

      // 2. Create Visual Layers
      for (let i = 0; i < layersData.length; i++) {
        const l = layersData[i]
        const oldId = l.id
        const newLayer = await tx.visualLayer.create({
          data: {
            organId: organ.id,
            name: l.name || `Layer ${i + 1}`,
            description: l.description || '',
            order: typeof l.order === 'number' ? l.order : i,
            visible: l.visible !== false,
            opacity: typeof l.opacity === 'number' ? l.opacity : 1.0,
            locked: !!l.locked,
            imagePath: l.imagePath || '',
            alignX: l.alignX || 0,
            alignY: l.alignY || 0,
            alignScale: l.alignScale || 1.0,
          },
        })
        if (oldId) layerIdMap.set(oldId, newLayer.id)
      }

      // Default layer if none were provided
      let defaultLayerId = layersData.length > 0 ? layerIdMap.get(layersData[0].id) : null
      if (!defaultLayerId) {
        const defLayer = await tx.visualLayer.create({
          data: {
            organId: organ.id,
            name: 'Base Layer',
            order: 0,
          },
        })
        defaultLayerId = defLayer.id
      }

      // 3. Create Concept Nodes
      for (const n of nodesData) {
        const oldId = n.id
        const targetLayerId = layerIdMap.get(n.layerId) || defaultLayerId
        const newNode = await tx.conceptNode.create({
          data: {
            organId: organ.id,
            layerId: targetLayerId,
            title: n.title || 'Untitled Node',
            canonicalName: n.canonicalName || '',
            category: n.category || '',
            aliases: n.aliases || '',
            shortDefinition: n.shortDefinition || '',
            detailedExplanation: n.detailedExplanation || '',
            tags: n.tags || '',
            authoringStatus: n.authoringStatus || 'draft',
            generalInfo: n.generalInfo || '',
            anatomicalLocation: n.anatomicalLocation || '',
            editorComment: n.editorComment || '',
            suggestedTrails: n.suggestedTrails || '',
          },
        })
        if (oldId) nodeIdMap.set(oldId, newNode.id)
      }

      // 4. Create Annotations
      for (const a of annotationsData) {
        const mappedLayerId = layerIdMap.get(a.layerId) || defaultLayerId
        const mappedNodeId = nodeIdMap.get(a.nodeId)
        if (mappedLayerId && mappedNodeId) {
          await tx.annotation.create({
            data: {
              layerId: mappedLayerId,
              nodeId: mappedNodeId,
              type: a.type === 'RECTANGLE' ? 'RECTANGLE' : 'PIN',
              x: Number(a.x) || 0,
              y: Number(a.y) || 0,
              width: Number(a.width) || 0,
              height: Number(a.height) || 0,
            },
          })
        }
      }

      // 5. Create Relationships
      for (const r of relationshipsData) {
        const srcId = nodeIdMap.get(r.sourceNodeId)
        const tgtId = nodeIdMap.get(r.targetNodeId)
        if (srcId && tgtId) {
          await tx.relationship.create({
            data: {
              organId: organ.id,
              sourceNodeId: srcId,
              targetNodeId: tgtId,
              type: r.type || 'PART_OF',
              lens: r.lens || 'HIERARCHY',
              label: r.label || '',
              explanation: r.explanation || '',
            },
          })
        }
      }

      // 6. Create Reasoning Paths & Steps
      for (const p of reasoningPathsData) {
        const oldPathId = p.id
        const newPath = await tx.reasoningPath.create({
          data: {
            organId: organ.id,
            name: p.name || 'Reasoning Path',
            description: p.description || '',
            guidingQuestion: p.guidingQuestion || '',
          },
        })
        if (oldPathId) pathIdMap.set(oldPathId, newPath.id)

        if (Array.isArray(p.steps)) {
          for (let i = 0; i < p.steps.length; i++) {
            const st = p.steps[i]
            const mappedNodeId = nodeIdMap.get(st.nodeId)
            if (mappedNodeId) {
              await tx.reasoningPathStep.create({
                data: {
                  pathId: newPath.id,
                  nodeId: mappedNodeId,
                  order: typeof st.order === 'number' ? st.order : i,
                  explanation: st.explanation || '',
                },
              })
            }
          }
        }
      }

      // 7. Create Hyperedges & Members
      for (const h of hyperedgesData) {
        const oldHyperedgeId = h.id
        const newHyperedge = await tx.hyperedge.create({
          data: {
            organId: organ.id,
            name: h.name || 'Hyperedge',
            type: h.type || '',
            description: h.description || '',
          },
        })
        if (oldHyperedgeId) hyperedgeIdMap.set(oldHyperedgeId, newHyperedge.id)

        if (Array.isArray(h.members)) {
          for (const m of h.members) {
            const mappedNodeId = nodeIdMap.get(m.nodeId)
            if (mappedNodeId) {
              await tx.hyperedgeMember.create({
                data: {
                  hyperedgeId: newHyperedge.id,
                  nodeId: mappedNodeId,
                  isOutcome: !!m.isOutcome,
                },
              })
            }
          }
        }
      }

      // 8. Create Evidence
      for (const e of evidenceData) {
        const targetId = e.targetType === 'REASONING_PATH'
          ? pathIdMap.get(e.targetId)
          : hyperedgeIdMap.get(e.targetId)

        if (targetId) {
          await tx.evidence.create({
            data: {
              targetType: e.targetType,
              targetId,
              sourceTitle: e.sourceTitle || 'Source Evidence',
              url: e.url || '',
              notes: e.notes || '',
              confidence: e.confidence || 'Medium',
              confidenceExplanation: e.confidenceExplanation || '',
            },
          })
        }
      }

      return organ
    })

    return NextResponse.json(resultOrgan)
  } catch (err: any) {
    console.error('Failed to import organ JSON:', err)
    return NextResponse.json({ error: err.message || 'Failed to import JSON' }, { status: 500 })
  }
}
