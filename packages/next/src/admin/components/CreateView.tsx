/**
 * CreateView - Create a new document
 * Server Component
 */

import type { RequestContext } from '../initReq'

export interface CreateViewProps {
  context: RequestContext
  collection: string
}

export async function CreateView({ context, collection }: CreateViewProps) {
  const { cms } = context

  // Find the collection config
  const collectionConfig = cms.getConfig().collections.find((c: { name: string }) => c.name === collection)

  if (!collectionConfig) {
    return (
      <div>
        <h1>Collection not found</h1>
        <p>Collection "{collection}" does not exist.</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Create {collectionConfig.labels?.singular || collection}</h1>

      <div>
        <a href={`/admin/${collection}`}>← Back to list</a>
      </div>

      <div>
        <h2>Fields</h2>
        <p>Form will be rendered here when UI package is ready.</p>
        <ul>
          {collectionConfig.fields.map((field: { name: string; type: string; required?: boolean }) => (
            <li key={field.name}>
              {field.name} ({field.type})
              {field.required && <span> *</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
