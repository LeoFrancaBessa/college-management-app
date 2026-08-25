const BASE = import.meta.env.VITE_API_URL ?? ''
export class ApiError extends Error {
  status: number
  detail: string
  fields?: Record<string, string>
  constructor(status: number, detail: string, fields?: Record<string, string>) { super(detail); this.name='ApiError'; this.status=status; this.detail=detail; this.fields=fields }
}
export async function apiFetch<T>(path:string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: isForm ? (init.headers as any) : { 'Content-Type':'application/json', ...(init.headers as any) },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(()=> ({}))
  if (!res.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : Array.isArray(body.detail) ? body.detail.map((d:any)=>d.msg).join('; ') : `HTTP ${res.status}`
    const fields: Record<string,string> = {}
    if (Array.isArray(body.detail)) for (const d of body.detail) if (d.loc) fields[d.loc[d.loc.length-1]] = d.msg
    throw new ApiError(res.status, detail, fields)
  }
  return body as T
}
export function buildQuery(params: Record<string, string|number|boolean|undefined|null>) {
  const sp = new URLSearchParams()
  for (const [k,v] of Object.entries(params)) if (v!==undefined && v!==null && v!=='') sp.set(k, String(v))
  const q = sp.toString(); return q ? `?${q}` : ''
}
