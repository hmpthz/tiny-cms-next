import { RootPage } from '@tiny-cms/next'
import { getCMS } from '../../../lib/cms'

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

  return <RootPage cms={cms} segments={slug || []} searchParams={search} />
}
