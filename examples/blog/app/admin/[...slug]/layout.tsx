import { RootLayout } from '@tiny-cms/next'
import { getCMS } from '../../../lib/cms'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cms = getCMS()
  return <RootLayout cms={cms}>{children}</RootLayout>
}
