import type { LayoutKind } from '../types.ts'

const EDGE = '1.5px solid #8B8FA0'

/**
 * Micro-icônes de l'inspecteur, dessinées en CSS comme dans le prototype :
 * des rectangles en bordure, aucun asset. Le codebase ne contient aucun jeu
 * d'icônes — en introduire un ici ne vaudrait que si toutes suivaient.
 */
export default function LayoutIcon({ kind }: { kind: LayoutKind }) {
  if (kind === 'single') {
    return <span style={{ width: 22, height: 15, border: EDGE, borderRadius: 2 }} />
  }

  if (kind === 'stack') {
    return (
      <span
        style={{
          width: 20,
          height: 14,
          border: EDGE,
          borderRadius: 2,
          boxShadow: '3px -3px 0 -1px #5C6070, 6px -6px 0 -1px #43465280',
        }}
      />
    )
  }

  if (kind === 'side') {
    return (
      <span style={{ display: 'flex', gap: 3 }}>
        <span style={{ width: 15, height: 22, border: EDGE, borderRadius: 2 }} />
        <span style={{ width: 15, height: 22, border: EDGE, borderRadius: 2 }} />
      </span>
    )
  }

  return (
    <span style={{ display: 'flex', gap: 2, perspective: 60 }}>
      <span
        style={{
          width: 14,
          height: 20,
          border: EDGE,
          borderRadius: 2,
          transform: 'rotateY(16deg)',
        }}
      />
      <span
        style={{
          width: 14,
          height: 20,
          border: EDGE,
          borderRadius: 2,
          transform: 'rotateY(-16deg)',
        }}
      />
    </span>
  )
}
