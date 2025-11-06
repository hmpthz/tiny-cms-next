import { RootLayout } from '@tiny-cms/next'
import { cms } from '../../../lib/cms'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RootLayout cms={cms}>{children}</RootLayout>
}
