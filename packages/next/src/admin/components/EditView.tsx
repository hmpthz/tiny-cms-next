/**
 * EditView - Edit a document
 * Server Component (for initial data loading)
 */

import type { RequestContext } from '../../handlers/auth'

export interface EditViewProps {
  context: RequestContext
  collection: string
  id: string
}

export async function EditView({ context, collection, id }: EditViewProps) {
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

  // Fetch the document
  const doc = await cms.getDb().findById(collection, id)

  if (!doc) {
    return (
      <div>
        <h1>Document not found</h1>
        <p>
          Document with ID "{id}" not found in collection "{collection}".
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1>
        Edit {collectionConfig.labels?.singular || collection}: {id}
      </h1>

      <div>
        <a href={`/admin/${collection}`}>← Back to list</a>
      </div>

      <div>
        <h2>Document Data</h2>
        <pre>{JSON.stringify(doc, null, 2)}</pre>
      </div>

      <div>
        <h2>Fields</h2>
        <p>Form will be rendered here when UI package is ready.</p>
        <ul>
          {collectionConfig.fields.map((field: { name: string; type: string }) => (
            <li key={field.name}>
              {field.name} ({field.type})
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
