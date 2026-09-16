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
    const request = (): Promise<string | undefined> => {
      const p: Promise<string | undefined> = host.requestToken().then(
        (t) => {
          if (pending === p && !t) pending = null
          return t
        },
        () => {
          // A rejected requestToken() behaves like an empty token: clear
          // `pending` (if it's still ours) so the next call asks again,
          // rather than leaving `pending` permanently settled to a rejection.
          if (pending === p) pending = null
          return undefined
        },
      )
      pending = p
      return p
    }
    const get: TokenGetter = () => pending ?? request()

    if (apiBaseUrl) {
      configureApi({ baseUrl: apiBaseUrl })
      registerTokenGetter(get)
      // Any non-empty token is worth the retry: Studio's interceptor retries
      // a 401 at most once, so an unchanged token cannot loop.
      registerAuthRefresher(async () => !!(await request()))
    }
    return get
  })
  return getToken
}
