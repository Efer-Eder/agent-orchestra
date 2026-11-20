/**
 * `?octo-anim` na URL força a animação dos mascotes mesmo com "reduzir
 * movimento" ligado no sistema. Serve para demonstrar em máquinas com
 * animações desligadas.
 */
export const FORCE_FROM_URL =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('octo-anim');
