/**
 * ListView - Display list of documents in a collection
 * Server Component
 */

import type { RequestContext } from '../../handlers/auth'

export interface ListViewProps {
  context: RequestContext
  collection: string
  limit?: number
  offset?: number
}

export async function ListView({ context, collection, limit = 10, offset = 0 }: ListViewProps) {
  const { cms } = context

  // Find the collection config
  const collectionConfig = cms
    .getConfig()
    .collections.find((c: { name: string }) => c.name === collection)

  if (!collectionConfig) {
    return (
      <div>
        <h1>Collection not found</h1>
        <p>Collection "{collection}" does not exist.</p>
      </div>
    )
  }

  // Fetch documents
  const result = (await cms.getDb().find(collection, {
    limit,
    offset,
  })) as {
    docs: Array<{ id: string; createdAt?: Date | string; [key: string]: unknown }>
    totalDocs: number
    limit: number
    offset: number
    totalPages: number
    page: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }

  return (
    <div>
      <h1>{collectionConfig.labels?.plural || collection}</h1>

      <div>
        <a href={`/admin/${collection}/create`}>Create New</a>
      </div>

      {result.docs.length === 0 ? (
        <p>No documents found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {result.docs.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.id}</td>
                <td>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}</td>
                <td>
                  <a href={`/admin/${collection}/${doc.id}`}>Edit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div>
        <p>
          Showing {result.offset + 1} to {Math.min(result.offset + result.limit, result.totalDocs)}{' '}
          of {result.totalDocs}
        </p>
        {result.hasPrevPage && (
          <a href={`/admin/${collection}?offset=${result.offset - result.limit}`}>Previous</a>
        )}
        {result.hasNextPage && (
          <a href={`/admin/${collection}?offset=${result.offset + result.limit}`}>Next</a>
        )}
      </div>
    </div>
  )
}
