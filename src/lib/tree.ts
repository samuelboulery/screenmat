import type { Annotation, LayerGroup, LayerNode } from '../types.ts'

/* Arbre de calques : groupes imbriqués, sélection, déplacement. Logique pure,
   aucun import React ni contexte canvas — le rendu consomme `flatten()`, il ne
   connaît pas l'arbre. */

export function isGroup(node: LayerNode): node is LayerGroup {
  return node.kind === 'group'
}

export type FlattenOptions = {
  /** Écarte les calques masqués, et tout le sous-arbre d'un groupe masqué. */
  skipHidden?: boolean
  /** Écarte les calques verrouillés — le hit-test et le rectangle de sélection
   *  ne doivent pas les attraper. */
  skipLocked?: boolean
}

/**
 * Les annotations de l'arbre, dans l'ordre de peinture : du fond vers l'avant,
 * groupes développés en place. C'est la seule vue que le rendu et le hit-test
 * connaissent.
 */
export function flatten(nodes: readonly LayerNode[], options: FlattenOptions = {}): Annotation[] {
  const out: Annotation[] = []

  const walk = (list: readonly LayerNode[], hidden: boolean, locked: boolean) => {
    for (const node of list) {
      // Un enfant hérite du plus restrictif : un groupe masqué masque tout.
      const nodeHidden = hidden || node.hidden
      const nodeLocked = locked || node.locked

      if (isGroup(node)) {
        walk(node.children, nodeHidden, nodeLocked)
        continue
      }
      if (options.skipHidden && nodeHidden) continue
      if (options.skipLocked && nodeLocked) continue
      out.push(node)
    }
  }

  walk(nodes, false, false)
  return out
}

/** Tous les identifiants de l'arbre, groupes compris. Alimente la signature de
 *  l'historique : sans les groupes, créer un groupe passerait pour un simple
 *  réglage et se ferait fusionner avec l'entrée précédente. */
export function nodeIds(nodes: readonly LayerNode[]): string[] {
  return nodes.flatMap((node) => (isGroup(node) ? [node.id, ...nodeIds(node.children)] : [node.id]))
}

/**
 * Les annotations qu'une sélection touche vraiment : sélectionner un groupe,
 * c'est sélectionner tout ce qu'il contient. Sert au déplacement, pas à la
 * suppression — retirer le groupe emporte déjà ses enfants.
 */
export function expandSelection(nodes: readonly LayerNode[], ids: readonly string[]): string[] {
  const chosen = new Set(ids)
  const out: string[] = []

  const walk = (list: readonly LayerNode[], inside: boolean) => {
    for (const node of list) {
      const taken = inside || chosen.has(node.id)
      if (isGroup(node)) walk(node.children, taken)
      else if (taken) out.push(node.id)
    }
  }

  walk(nodes, false)
  return out
}

/**
 * Les identifiants dans l'ordre où le panneau les affiche : chaque niveau à
 * l'envers de la pile — le dernier créé passe au-dessus — un groupe suivi de ses
 * enfants s'il est déplié. C'est la référence de la sélection de plage (⇧-clic).
 */
export function displayOrder(nodes: readonly LayerNode[]): string[] {
  return [...nodes].reverse().flatMap((node) =>
    isGroup(node) && !node.collapsed ? [node.id, ...displayOrder(node.children)] : [node.id],
  )
}

export type Found = {
  node: LayerNode
  /** `null` à la racine. */
  parent: LayerGroup | null
  index: number
}

export function findNode(nodes: readonly LayerNode[], id: string): Found | null {
  const walk = (list: readonly LayerNode[], parent: LayerGroup | null): Found | null => {
    for (let index = 0; index < list.length; index += 1) {
      const node = list[index]
      if (node.id === id) return { node, parent, index }
      if (isGroup(node)) {
        const found = walk(node.children, node)
        if (found) return found
      }
    }
    return null
  }
  return walk(nodes, null)
}

/** L'annotation portant cet identifiant, `null` si c'est un groupe ou rien. */
export function findAnnotation(nodes: readonly LayerNode[], id: string): Annotation | null {
  const found = findNode(nodes, id)
  return found && !isGroup(found.node) ? found.node : null
}

/** Applique un patch au nœud visé, en recopiant la branche qui y mène. */
export function updateNode(
  nodes: readonly LayerNode[],
  id: string,
  patch: (node: LayerNode) => LayerNode,
): LayerNode[] {
  return nodes.map((node) => {
    if (node.id === id) return patch(node)
    if (isGroup(node)) return { ...node, children: updateNode(node.children, id, patch) }
    return node
  })
}

/** Retire les nœuds visés, où qu'ils soient dans l'arbre. */
export function removeNodes(nodes: readonly LayerNode[], ids: readonly string[]): LayerNode[] {
  const doomed = new Set(ids)
  return nodes
    .filter((node) => !doomed.has(node.id))
    .map((node) => (isGroup(node) ? { ...node, children: removeNodes(node.children, ids) } : node))
}

/** Insère des nœuds dans un parent (`null` = racine) à la position donnée. */
export function insertNodes(
  nodes: readonly LayerNode[],
  parentId: string | null,
  index: number,
  added: readonly LayerNode[],
): LayerNode[] {
  if (parentId === null) {
    const next = [...nodes]
    next.splice(clamp(index, next.length), 0, ...added)
    return next
  }

  return updateNode(nodes, parentId, (node) => {
    if (!isGroup(node)) return node
    const children = [...node.children]
    children.splice(clamp(index, children.length), 0, ...added)
    return { ...node, children }
  })
}

function clamp(index: number, length: number): number {
  return Math.max(0, Math.min(index, length))
}

/** Vrai si `id` est ce groupe ou l'un de ses descendants. */
function contains(group: LayerGroup, id: string): boolean {
  return group.children.some((child) => child.id === id || (isGroup(child) && contains(child, id)))
}

/**
 * Déplace des nœuds dans un parent, à un index exprimé **dans l'arbre
 * d'origine** : on retire d'abord, puis on corrige l'index du nombre de frères
 * retirés avant lui, sinon un déplacement vers le bas atterrit une place trop
 * haut.
 */
export function moveNodes(
  nodes: readonly LayerNode[],
  ids: readonly string[],
  parentId: string | null,
  index: number,
): LayerNode[] {
  const moved = ids
    .map((id) => findNode(nodes, id))
    .filter((found): found is Found => found !== null)
    // Un groupe ne peut pas devenir son propre descendant : le déposer dans
    // lui-même détacherait toute sa branche de l'arbre.
    .filter(({ node }) => !(isGroup(node) && (node.id === parentId || contains(node, parentId ?? ''))))

  if (moved.length === 0) return [...nodes]
  if (parentId !== null && moved.some(({ node }) => node.id === parentId)) return [...nodes]

  const siblings = parentId === null ? nodes : (findNode(nodes, parentId)?.node as LayerGroup)?.children
  if (!siblings) return [...nodes]

  const before = moved.filter(({ node }) => {
    const position = siblings.findIndex((sibling) => sibling.id === node.id)
    return position >= 0 && position < index
  }).length

  const pruned = removeNodes(nodes, moved.map(({ node }) => node.id))
  return insertNodes(pruned, parentId, index - before, moved.map(({ node }) => node))
}

/**
 * Enferme une sélection dans un groupe neuf. Le groupe se pose à la place du
 * membre le plus en avant, chez le parent de celui-ci : une sélection éparse se
 * rassemble donc là où elle était le plus visible.
 *
 * L'identifiant est fourni par l'appelant : la fonction reste pure, et le hook
 * qui l'appelle a besoin de connaître le groupe pour le sélectionner.
 */
export function groupNodes(
  nodes: readonly LayerNode[],
  ids: readonly string[],
  name: string,
  groupId: string,
): LayerNode[] {
  const members = ids
    .map((id) => findNode(nodes, id))
    .filter((found): found is Found => found !== null)
  if (members.length === 0) return [...nodes]

  // Les groupes de la sélection emmènent leur contenu : inutile de descendre.
  const roots = members.filter(
    ({ node }) => !members.some(({ node: other }) => other !== node && isGroup(other) && contains(other, node.id)),
  )

  const anchor = roots[roots.length - 1]
  const group: LayerGroup = {
    id: groupId,
    kind: 'group',
    name,
    collapsed: false,
    hidden: false,
    locked: false,
    children: roots.map(({ node }) => node),
  }

  const pruned = removeNodes(nodes, roots.map(({ node }) => node.id))
  const parentId = anchor.parent?.id ?? null
  const siblings = parentId === null ? pruned : (findNode(pruned, parentId)?.node as LayerGroup)?.children
  const index = siblings ? Math.min(anchor.index, siblings.length) : 0

  return insertNodes(pruned, parentId, index, [group])
}

/** Dissout un groupe : ses enfants remontent à sa place. */
export function ungroup(nodes: readonly LayerNode[], groupId: string): LayerNode[] {
  const found = findNode(nodes, groupId)
  if (!found || !isGroup(found.node)) return [...nodes]

  const parentId = found.parent?.id ?? null
  const pruned = removeNodes(nodes, [groupId])
  return insertNodes(pruned, parentId, found.index, found.node.children)
}
