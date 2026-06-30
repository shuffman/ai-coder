/// <reference types="vite/client" />
import type { AiCoderApi } from '../../shared/types'

declare global {
  interface Window {
    aicoder: AiCoderApi
    platform: NodeJS.Platform
  }
}
