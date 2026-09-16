import { useState } from 'react'
import { configureApi, registerAuthRefresher, registerTokenGetter } from 'quodsi_studio/lib/api'
import type { LucidModalHost } from './lucidModalHost'

export type TokenGetter = () => Promise<string | undefined>

/** Point Studio's api client at the API and feed it the extension's Kinde token.
 *  Runs once, synchronously, before the surface renders, so `host` must be
 *  stable for the view's lifetime.
 *
 *  Returns the shared token getter: concurrent callers (the view's sign-in
 *  probe, Studio's api client) share one in-flight request, a token is kept
 *  once it arrives, and an empty answer is not kept so the next call asks
 *  again. The refresher always asks the extension anew. */
export function useStudioApiSetup(apiBaseUrl: string | null, host: LucidModalHost): TokenGetter {
  const [getToken] = useState(() => {
    let pending: Promise<string | undefined> | null = null
    let token: string | undefined
    const request = (): Promise<string | undefined> => {
      const p: Promise<string | undefined> = host.requestToken().then((t) => {
        if (pending === p) {
          token = t
          if (!t) pending = null
        }
        return t
      })
      pending = p
      return p
    }
    const get: TokenGetter = () => pending ?? request()

    if (apiBaseUrl) {
      configureApi({ baseUrl: apiBaseUrl })
      registerTokenGetter(get)
      registerAuthRefresher(async () => {
        const previous = token
        const fresh = await request()
        return !!fresh && fresh !== previous
      })
    }
    return get
  })
  return getToken
}
