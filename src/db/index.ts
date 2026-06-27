import { sql } from './client'
import { initSchema } from './schema'
import { maybeSeed } from './seed'

export { sql }

let _init: Promise<void> | undefined

export function ensureReady(): Promise<void> {
  if (!_init) {
    _init = initSchema().then(maybeSeed)
  }
  return _init
}
