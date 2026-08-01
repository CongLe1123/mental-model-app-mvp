import { describe, it, expect } from 'vitest'

// Validation functions (mirrors API logic)
const RELATIONSHIP_TYPES = ['PART_OF', 'CONTAINS', 'ADJACENT_TO', 'FLOWS_TO', 'DRAINS_TO', 'SUPPLIES', 'INNERVATES', 'CAUSES', 'LEADS_TO', 'RESULTS_IN', 'PREVENTS', 'MECHANISM_OF', 'EXPLAINS', 'EVOLVES_TO', 'WORSENS_TO', 'IMPROVES_TO']

const HIERARCHY_TYPES = ['PART_OF', 'CONTAINS', 'ADJACENT_TO']
const ROUTE_TYPES = ['FLOWS_TO', 'DRAINS_TO', 'SUPPLIES', 'INNERVATES']
const MECHANISM_TYPES = ['CAUSES', 'LEADS_TO', 'RESULTS_IN', 'PREVENTS', 'MECHANISM_OF', 'EXPLAINS']

function computeLens(type: string): string {
  if (HIERARCHY_TYPES.includes(type)) return 'HIERARCHY'
  if (ROUTE_TYPES.includes(type)) return 'ROUTE'
  if (MECHANISM_TYPES.includes(type)) return 'MECHANISM_FUNCTION'
  return 'STATE'
}

function validateRelationship(sourceNodeId: string, targetNodeId: string, type: string): string | null {
  if (!sourceNodeId) return 'Source node required'
  if (!targetNodeId) return 'Target node required'
  if (!type) return 'Type required'
  if (!RELATIONSHIP_TYPES.includes(type)) return 'Invalid type'
  if (sourceNodeId === targetNodeId) return 'Cannot relate node to itself'
  return null
}

function validateReasoningPath(name: string, nodeCount: number): string | null {
  if (!name?.trim()) return 'Name required'
  if (nodeCount < 2) return 'Path must have at least 2 nodes'
  return null
}

function validateHyperedge(name: string, memberCount: number): string | null {
  if (!name?.trim()) return 'Name required'
  if (memberCount < 2) return 'Hyperedge must have at least 2 members'
  return null
}

function validateCloneLayer(sourceLayers: number): string | null {
  if (sourceLayers < 1) return 'No source layer to clone'
  return null
}

describe('Relationship validation', () => {
  it('rejects missing source', () => {
    expect(validateRelationship('', 'node2', 'PART_OF')).toBe('Source node required')
  })

  it('rejects missing target', () => {
    expect(validateRelationship('node1', '', 'PART_OF')).toBe('Target node required')
  })

  it('rejects self-relationship', () => {
    expect(validateRelationship('node1', 'node1', 'PART_OF')).toBe('Cannot relate node to itself')
  })

  it('rejects invalid type', () => {
    expect(validateRelationship('node1', 'node2', 'INVALID')).toBe('Invalid type')
  })

  it('accepts valid relationship', () => {
    expect(validateRelationship('node1', 'node2', 'FLOWS_TO')).toBeNull()
  })

  it('accepts all relationship types', () => {
    for (const type of RELATIONSHIP_TYPES) {
      expect(validateRelationship('a', 'b', type)).toBeNull()
    }
  })
})

describe('Lens computation', () => {
  it('hierarchy types map to HIERARCHY', () => {
    expect(computeLens('PART_OF')).toBe('HIERARCHY')
    expect(computeLens('CONTAINS')).toBe('HIERARCHY')
    expect(computeLens('ADJACENT_TO')).toBe('HIERARCHY')
  })

  it('route types map to ROUTE', () => {
    expect(computeLens('FLOWS_TO')).toBe('ROUTE')
    expect(computeLens('INNERVATES')).toBe('ROUTE')
  })

  it('mechanism types map to MECHANISM_FUNCTION', () => {
    expect(computeLens('CAUSES')).toBe('MECHANISM_FUNCTION')
    expect(computeLens('EXPLAINS')).toBe('MECHANISM_FUNCTION')
  })

  it('state types map to STATE', () => {
    expect(computeLens('EVOLVES_TO')).toBe('STATE')
    expect(computeLens('WORSENS_TO')).toBe('STATE')
  })
})

describe('Reasoning path validation', () => {
  it('rejects empty name', () => {
    expect(validateReasoningPath('', 2)).toBe('Name required')
  })

  it('rejects single node', () => {
    expect(validateReasoningPath('Path', 1)).toBe('Path must have at least 2 nodes')
  })

  it('accepts valid path', () => {
    expect(validateReasoningPath('Path', 2)).toBeNull()
  })
})

describe('Hyperedge validation', () => {
  it('rejects empty name', () => {
    expect(validateHyperedge('', 2)).toBe('Name required')
  })

  it('rejects single member', () => {
    expect(validateHyperedge('HE', 1)).toBe('Hyperedge must have at least 2 members')
  })

  it('accepts valid hyperedge', () => {
    expect(validateHyperedge('HE', 2)).toBeNull()
  })
})

describe('Layer clone validation', () => {
  it('rejects clone with no source layers', () => {
    expect(validateCloneLayer(0)).toBe('No source layer to clone')
  })

  it('accepts clone with source layers', () => {
    expect(validateCloneLayer(1)).toBeNull()
  })
})
