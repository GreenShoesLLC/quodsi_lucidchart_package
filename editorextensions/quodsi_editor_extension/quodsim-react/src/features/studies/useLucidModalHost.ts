import { useLayoutEffect, useRef, useState } from 'react'
import { useMessaging } from '../../messaging/MessageProvider'
import { createLucidModalHost, windowPorts, type LucidModalHost, type ModalHostPorts } from './lucidModalHost'

/** One LucidModalHost for the view's lifetime.
 *
 *  MessageProvider hands out a new `sendMessage` once after mount (it depends
 *  on the panel type, which an effect sets). The host must not be rebuilt for
 *  that: Studio's token getter captured it once (useStudioApiSetup), so a new
 *  host would leave the getter calling a disconnected one. Sends go through a
 *  ref to whichever `sendMessage` is current instead. */
export function useLucidModalHost(opts: { withWriter?: boolean } = {}): LucidModalHost {
  const { sendMessage } = useMessaging()
  const sendRef = useRef(sendMessage)
  useLayoutEffect(() => {
    sendRef.current = sendMessage
  }, [sendMessage])
  const [host] = useState(() => {
    const send: ModalHostPorts['send'] = (...args) => sendRef.current(...args)
    return createLucidModalHost(windowPorts(send), opts)
  })
  return host
}
