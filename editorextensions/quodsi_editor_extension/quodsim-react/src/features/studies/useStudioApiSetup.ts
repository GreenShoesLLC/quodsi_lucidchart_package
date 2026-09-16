import { useState } from 'react'
import { configureApi, registerAuthRefresher, registerTokenGetter } from 'quodsi_studio/lib/api'
import type { LucidModalHost } from './lucidModalHost'

/** Point Studio's api client at the API and feed it the extension's Kinde token.
 *  Runs once, synchronously, before the surface renders. */
export function useStudioApiSetup(apiBaseUrl: string | null, host: LucidModalHost): void {
  useState(() => {
    if (!apiBaseUrl) return null
    configureApi({ baseUrl: apiBaseUrl })
    let token: string | undefined
    registerTokenGetter(async () => (token ??= await host.requestToken()))
    registerAuthRefresher(async () => {
      const previous = token
      token = await host.requestToken()
      return !!token && token !== previous
    })
    return null
  })
}
