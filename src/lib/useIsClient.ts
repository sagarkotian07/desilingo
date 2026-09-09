'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const onClient = () => true
const onServer = () => false

/**
 * True once running in the browser, false during server rendering.
 *
 * Uses useSyncExternalStore rather than the setState-in-an-effect idiom, which
 * triggers a second render pass on every mount.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer)
}
