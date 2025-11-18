'use client'

import { useState } from 'react'
import { AdminLayout } from '../components/AdminLayout'
import type {
  AccountInitialData,
  DashboardCollectionInfo,
  DashboardInitialData,
} from '../types'

export interface AccountPageProps {
  initialData: AccountInitialData
  collections: DashboardCollectionInfo[]
  currentUser: DashboardInitialData['user']
  serverActions: {
    updateAccount: (values: Record<string, unknown>) => Promise<void>
  }
}

export function AccountPage({
  initialData,
  collections,
  currentUser,
  serverActions,
}: AccountPageProps) {
  const [name, setName] = useState<string>(() =>
    typeof initialData.user.name === 'string' ? initialData.user.name : '',
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    try {
      setIsSubmitting(true)
      await serverActions.updateAccount({ name })
      setMessage('Profile updated successfully.')
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Failed to update profile'
      setError(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminLayout user={currentUser} collections={collections}>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Account settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update basic information for your account.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md border border-emerald-500/70 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="mt-1 text-sm text-muted-foreground break-all">
              {String(initialData.user.email || '') || 'Not set'}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}

