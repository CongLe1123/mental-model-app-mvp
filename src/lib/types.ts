// Core domain types matching Prisma schema

export interface OrganData {
  id: string
  name: string
  description: string
  thumbnail: string
  createdAt: string
  updatedAt: string
}

export interface VisualLayerData {
  id: string
  organId: string
  name: string
  description: string
  order: number
  visible: boolean
  opacity: number
  locked: boolean
  imagePath: string
  alignX: number
  alignY: number
  alignScale: number
  createdAt: string
  updatedAt: string
}

export interface AnnotationData {
  id: string
  layerId: string
  nodeId: string
  type: 'PIN' | 'RECTANGLE'
  x: number
  y: number
  width: number
  height: number
}

export interface ConceptNodeData {
  id: string
  organId: string
  layerId: string
  title: string
  canonicalName?: string
  category?: string
  aliases?: string
  shortDefinition?: string
  detailedExplanation?: string
  tags?: string
  authoringStatus?: string
  generalInfo?: string
  anatomicalLocation?: string
  editorComment?: string
  suggestedTrails?: string
}

export interface RelationshipData {
  id: string
  organId: string
  sourceNodeId: string
  targetNodeId: string
  type: string
  lens: string
  label: string
  explanation: string
}

export interface ReasoningPathData {
  id: string
  organId: string
  name: string
  description: string
  guidingQuestion: string
  steps: ReasoningPathStepData[]
}

export interface ReasoningPathStepData {
  id: string
  pathId: string
  nodeId: string
  order: number
  explanation: string
  node?: ConceptNodeData
}

export interface HyperedgeData {
  id: string
  organId: string
  name: string
  type: string
  description: string
  members: HyperedgeMemberData[]
}

export interface HyperedgeMemberData {
  id: string
  hyperedgeId: string
  nodeId: string
  isOutcome: boolean
  node?: ConceptNodeData
}

export interface EvidenceData {
  id: string
  targetType: 'REASONING_PATH' | 'HYPEREDGE'
  targetId: string
  sourceTitle: string
  url: string
  notes: string
  confidence: 'Low' | 'Medium' | 'High'
  confidenceExplanation: string
}

// Complex response types
export interface OrganWithAllData extends OrganData {
  visualLayers: VisualLayerData[]
  conceptNodes: ConceptNodeData[]
  relationships: RelationshipData[]
  reasoningPaths: ReasoningPathData[]
  hyperedges: HyperedgeData[]
}

export interface NodeWithRelations extends ConceptNodeData {
  annotations: AnnotationData[]
  outgoingRelations: RelationshipData[]
  incomingRelations: RelationshipData[]
  layerName?: string
}

export interface DeleteImpact {
  relationships: number
  crossLayerRelationships: number
  reasoningPathSteps: number
  reasoningPaths: number
  hyperedgeMembers: number
  hyperedges: number
  evidence: number
}
