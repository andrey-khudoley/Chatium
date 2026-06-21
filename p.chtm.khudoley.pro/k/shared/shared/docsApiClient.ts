// @shared
import { listDocsRoute, getDocRoute, putDocRoute, deleteDocRoute } from '../api/docs'

interface DocsItem {
  key: string
  size: number
  lastModified: string
}

interface ListResponse {
  items: DocsItem[]
  nextToken?: string
}

export class DocsApiClient {
  constructor(private base: string, private adminToken?: string) {}

  async list(limit: number = 1000, token?: string): Promise<ListResponse> {
    const params: any = {
      limit: limit.toString(),
    }
    if (token) {
      params.token = token
    }
    
    const result = await listDocsRoute.query(params).run(ctx)
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }
    
    return result.data as ListResponse
  }

  async get(filename: string, download: boolean = false): Promise<string> {
    const params: any = {
      filename,
    }
    if (download) {
      params.download = 'true'
    }
    
    const result = await getDocRoute.query(params).run(ctx)
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }
    
    return result.data as string
  }

  async put(filename: string, markdown: string): Promise<{ ok: true; etag: string }> {
    const result = await putDocRoute.run(ctx, {
      filename,
      markdown,
    })
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }
    
    return { ok: true, etag: result.etag || '' }
  }

  async del(filename: string): Promise<void> {
    const result = await deleteDocRoute.run(ctx, {
      filename,
    })
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error')
    }
  }
}
