'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import type { TinyCmsSDK } from '@tiny-cms/core/sdk'

interface SdkClientContextValue {
  sdk: TinyCmsSDK
}

const SdkClientContext = createContext<SdkClientContextValue | null>(null)

export interface SdkClientProviderProps {
  sdk: TinyCmsSDK
  children: ReactNode
}

export function SdkClientProvider({ sdk, children }: SdkClientProviderProps) {
  return <SdkClientContext.Provider value={{ sdk }}>{children}</SdkClientContext.Provider>
}

export function useSdkClient(): TinyCmsSDK {
  const context = useContext(SdkClientContext)
  if (!context) {
    throw new Error('useSdkClient must be used within an SdkClientProvider')
  }
  return context.sdk
}
