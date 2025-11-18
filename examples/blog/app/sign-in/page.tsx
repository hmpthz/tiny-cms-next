import { redirect } from 'next/navigation'
import type { SignInInitialData } from '@tiny-cms/admin-ui'
import { SignInPage } from '@tiny-cms/admin-ui'
import { getServerAuth } from '@tiny-cms/next'
import { getCMS } from '../../lib/cms'

export default async function SignInRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const [search, auth] = await Promise.all([searchParams, getServerAuth(getCMS())])

  const redirectTo =
    typeof search.redirect === 'string' && search.redirect
      ? search.redirect
      : '/admin'

  if (auth?.user) {
    redirect(redirectTo)
  }

  const initialData: SignInInitialData = {
    isAuthenticated: !!auth,
    redirectTo,
  }

  return <SignInPage initialData={initialData} />
}

