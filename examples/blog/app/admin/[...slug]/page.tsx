import { RootAdminPage } from '@tiny-cms/next/admin'
import { SdkClientProvider } from '@tiny-cms/admin-ui'
import { TinyCmsSDK } from '@tiny-cms/core/sdk'
import { getCMS } from '../../../lib/cms'

function createSdk() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  return new TinyCmsSDK({
    baseUrl,
    apiPrefix: '/api',
  })
}

function RootProvider({ children }: { children: React.ReactNode }) {
  const sdk = createSdk()
  return <SdkClientProvider sdk={sdk}>{children}</SdkClientProvider>
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const search = await searchParams
  const cms = getCMS()

  return (
    <RootAdminPage
      cms={cms}
      segments={slug || []}
      searchParams={search}
      RootProvider={RootProvider}
    />
  )
}
