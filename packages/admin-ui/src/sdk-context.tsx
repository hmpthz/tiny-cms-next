'use client'

import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import type { TinyCmsSDK } from '@tiny-cms/core/sdk'

interface AdminSdkContextValue {
  sdk: TinyCmsSDK
}

const AdminSdkContext = createContext<AdminSdkContextValue | null>(null)

export interface AdminSdkProviderProps {
  sdk: TinyCmsSDK
  children: ReactNode
}

export function AdminSdkProvider({ sdk, children }: AdminSdkProviderProps) {
  return <AdminSdkContext.Provider value={{ sdk }}>{children}</AdminSdkContext.Provider>
}

export function useAdminSdk(): TinyCmsSDK {
  const context = useContext(AdminSdkContext)
  if (!context) {
    throw new Error('useAdminSdk must be used within an AdminSdkProvider')
  }
  return context.sdk
}

