/**
 * Le seul endroit de `/docs` qui touche au DOM. Il transforme l'arbre produit
 * par `md.ts` en nœuds : `createElement`, `setAttribute`, `createTextNode` —
 * jamais `innerHTML`. Du texte reste du texte, quoi qu'il contienne.
 */
import type { El } from './md.ts'

export function toDom(nodes: El[]): DocumentFragment {
  const fragment = document.createDocumentFragment()
  for (const node of nodes) fragment.append(toNode(node))
  return fragment
}

function toNode(node: El): Node {
  if (typeof node === 'string') return document.createTextNode(node)

  const element = document.createElement(node.tag)
  for (const [name, value] of Object.entries(node.attrs ?? {})) element.setAttribute(name, value)
  for (const child of node.children ?? []) element.append(toNode(child))
  return element
}
