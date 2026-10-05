/** Reconnaît l'échec de chargement de `@napi-rs/canvas` — et lui seul. Deux cas :
 *  le paquet absent (`Cannot find package '@napi-rs/canvas' imported from …`, où
 *  seul le nom entre guillemets compte : le chemin de l'importateur peut contenir
 *  `@napi-rs/canvas`), et le paquet présent sans binaire pour la plateforme, dont
 *  le chargeur (`js-binding.js`) lève `Cannot find native binding.` ou
 *  `Failed to load native binding`. */
export function isCanvasMissing(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const { code, message } = error as NodeJS.ErrnoException
  if (code === 'ERR_MODULE_NOT_FOUND' && /Cannot find package '@napi-rs\/canvas'/.test(message)) return true
  return /^(Cannot find native binding|Failed to load native binding)/.test(message)
}
