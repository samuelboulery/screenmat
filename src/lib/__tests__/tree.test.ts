import { describe, expect, it } from 'vitest'
import { createAnnotation } from '../annotate.ts'
import {
  displayOrder,
  expandSelection,
  findNode,
  flatten,
  groupNodes,
  moveNodes,
  nodeIds,
  removeNodes,
  ungroup,
  updateNode,
} from '../tree.ts'
import type { Annotation, LayerGroup, LayerNode } from '../../types.ts'

const rect = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 }

const layer = (id: string, patch: Partial<Annotation> = {}): Annotation => ({
  ...createAnnotation('box', rect),
  id,
  ...patch,
})

const group = (id: string, children: LayerNode[], patch: Partial<LayerGroup> = {}): LayerGroup => ({
  id,
  kind: 'group',
  name: id,
  collapsed: false,
  hidden: false,
  locked: false,
  children,
  ...patch,
})

/** a · [g1: b · c] · d */
const tree = (): LayerNode[] => [layer('a'), group('g1', [layer('b'), layer('c')]), layer('d')]

describe('flatten', () => {
  it('rend les calques dans l’ordre de peinture, groupes développés en place', () => {
    expect(flatten(tree()).map((node) => node.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('écarte un calque masqué, et tout le sous-arbre d’un groupe masqué', () => {
    const nodes: LayerNode[] = [
      layer('a', { hidden: true }),
      group('g1', [layer('b'), layer('c')], { hidden: true }),
      layer('d'),
    ]
    expect(flatten(nodes, { skipHidden: true }).map((node) => node.id)).toEqual(['d'])
    // Sans l'option, rien n'est filtré : le panneau, lui, montre tout.
    expect(flatten(nodes)).toHaveLength(4)
  })

  it('écarte un verrouillé hérité — le cadenas d’un groupe protège ses enfants', () => {
    const nodes: LayerNode[] = [group('g1', [layer('b')], { locked: true }), layer('d')]
    expect(flatten(nodes, { skipLocked: true }).map((node) => node.id)).toEqual(['d'])
  })
})

describe('nodeIds et displayOrder', () => {
  it('nodeIds compte les groupes — sinon l’historique les manquerait', () => {
    expect(nodeIds(tree())).toEqual(['a', 'g1', 'b', 'c', 'd'])
  })

  it('displayOrder renverse chaque niveau et replie un groupe fermé', () => {
    expect(displayOrder(tree())).toEqual(['d', 'g1', 'c', 'b', 'a'])

    const closed: LayerNode[] = [group('g1', [layer('b')], { collapsed: true }), layer('d')]
    expect(displayOrder(closed)).toEqual(['d', 'g1'])
  })
})

describe('expandSelection', () => {
  it('sélectionner un groupe, c’est sélectionner tout ce qu’il contient', () => {
    expect(expandSelection(tree(), ['g1'])).toEqual(['b', 'c'])
    expect(expandSelection(tree(), ['a', 'c'])).toEqual(['a', 'c'])
  })
})

describe('updateNode et removeNodes', () => {
  it('atteignent un nœud en profondeur sans muter l’original', () => {
    const before = tree()
    const after = updateNode(before, 'c', (node) => ({ ...node, hidden: true }))

    expect(findNode(after, 'c')?.node.hidden).toBe(true)
    expect(findNode(before, 'c')?.node.hidden).toBe(false)
  })

  it('retirent un enfant de groupe', () => {
    expect(nodeIds(removeNodes(tree(), ['b']))).toEqual(['a', 'g1', 'c', 'd'])
  })
})

describe('moveNodes', () => {
  it('déplace un calque dans un groupe', () => {
    const moved = moveNodes(tree(), ['a'], 'g1', 0)
    const g1 = findNode(moved, 'g1')?.node as LayerGroup
    expect(g1.children.map((node) => node.id)).toEqual(['a', 'b', 'c'])
    expect(moved.map((node) => node.id)).toEqual(['g1', 'd'])
  })

  it('corrige l’index quand le nœud déplacé était devant sa cible', () => {
    // a → tout en haut de la pile : il doit finir dernier, pas avant-dernier.
    const moved = moveNodes(tree(), ['a'], null, 3)
    expect(moved.map((node) => node.id)).toEqual(['g1', 'd', 'a'])
  })

  it('refuse de déposer un groupe dans sa propre descendance', () => {
    const nested: LayerNode[] = [group('g1', [group('g2', [layer('b')])])]
    expect(nodeIds(moveNodes(nested, ['g1'], 'g2', 0))).toEqual(nodeIds(nested))
    expect(nodeIds(moveNodes(nested, ['g1'], 'g1', 0))).toEqual(nodeIds(nested))
  })
})

describe('groupNodes et ungroup', () => {
  it('rassemble une sélection à la place de son membre le plus en avant', () => {
    const grouped = groupNodes(tree(), ['a', 'd'], 'Flow', 'g2')
    expect(grouped.map((node) => node.id)).toEqual(['g1', 'g2'])
    const g2 = findNode(grouped, 'g2')?.node as LayerGroup
    expect(g2.name).toBe('Flow')
    expect(g2.children.map((node) => node.id)).toEqual(['a', 'd'])
  })

  it('n’emmène pas deux fois un enfant dont le groupe est aussi sélectionné', () => {
    const grouped = groupNodes(tree(), ['g1', 'b'], 'Flow', 'g2')
    const g2 = findNode(grouped, 'g2')?.node as LayerGroup
    expect(g2.children.map((node) => node.id)).toEqual(['g1'])
    expect(nodeIds(grouped).filter((id) => id === 'b')).toHaveLength(1)
  })

  it('dissout un groupe en remettant ses enfants à sa place', () => {
    const grouped = groupNodes(tree(), ['a', 'd'], 'Flow', 'g2')
    expect(nodeIds(ungroup(grouped, 'g2'))).toEqual(['g1', 'b', 'c', 'a', 'd'])
  })
})
