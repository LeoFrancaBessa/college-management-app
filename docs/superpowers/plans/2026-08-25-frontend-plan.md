# Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the dashboard-first frontend MVP (white + #fb93d7) that covers the full Period → Course → Item lifecycle, pluggable features, boards, schedule, AI Cmd+K and trash with full mobile parity.

**Architecture:** React Router is the navigation source-of-truth, TanStack Query is the remote-data source-of-truth (no Zustand/Redux). A single `api/client.ts` fetch wrapper uses `credentials:'include'` for httpOnly cookies; `vite.config.ts` proxies `/api` to `localhost:8000` in dev and Caddy serves same-origin in prod. Tailwind provides the only styling layer; Board and Schedule are lazy-loaded.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, React Router 7.18, TanStack Query 5.101, Tailwind, dnd-kit 6/10, FullCalendar 6/7, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-25-frontend-design.md` (plus `docs/architecture.md`, `specs/00-06`)

## Global Constraints

- Theme is white + primary `#fb93d7` with tints `#fff0f8` (primary-50) / `#ffe4f2` (primary-100); primary only on CTAs, active tab, selected badge, focus ring and calendar today highlight.
- Mobile is first-class at 50% usage: every desktop feature must be reachable on mobile with adapted interaction (BottomNav, no mandatory drag, touch targets >=44px, `py-3` lists, `pointer:coarse` fallback). Never degrade — adapt.
- Single-user system; no RBAC/multi-tenant; auth is cookie httpOnly — frontend never reads/writes a token in JS, every fetch uses `credentials:'include'`.
- No subtipos rígidos de Item (Regra pétrea 3): features are opt-in JSON keys `grade/checklist/notes/recurrence`; frontend sends canonical shape only (backend tolerates aliases).
- Cronograma is a view, never an entity (Regra pétrea 2): frontend never expands recurrence — it renders what `GET /schedule` returns.
- Deletion via AI is always soft delete; direct user delete is hard with cascade confirmation — `ConfirmDialog` must warn about cascade.
- Stack locks: React 19 + Vite + TypeScript + React Router 7 + TanStack Query 5 + Tailwind + dnd-kit + FullCalendar already in `frontend/package.json` — do not add shadcn/zustand/msw in MVP.
- Backend pagination is `?limit` 1..100 and `?offset` >=0 (422 on violation); absence means return-all; frontend honors it and uses "Load more" only on Schedule in MVP.
- API base is `VITE_API_URL ?? ''` (relative in prod); dev proxy is `'/api' → 'http://localhost:8000'` in `vite.config.ts`.
- Follow existing backend route prefixes exactly as in `backend/app/api/v1/router.py` (`/api/v1/periods`, `/courses`, `/items`, `/item-types`, `/tags`, `/boards`, `/schedule`, `/ai`, `/trash`, `/attachments`, `/export`, `/import`, `/auth`). Portuguese routes in frontend (`/periodos`, `/cadeiras`, `/itens`, `/cronograma`, `/lixeira`) map to those API paths.

---

## File Structure

**New files:**

- `frontend/tailwind.config.js` + `frontend/postcss.config.js` + `frontend/src/index.css` (Tailwind directives + theme extension)
- `frontend/src/lib/queryClient.ts`
- `frontend/src/lib/formatDate.ts`
- `frontend/src/lib/pagination.ts`
- `frontend/src/api/client.ts`
- `frontend/src/api/types.ts`
- `frontend/src/api/auth.ts`
- `frontend/src/api/periods.ts`
- `frontend/src/api/courses.ts`
- `frontend/src/api/items.ts`
- `frontend/src/api/itemTypes.ts`
- `frontend/src/api/boards.ts`
- `frontend/src/api/schedule.ts`
- `frontend/src/api/tags.ts`
- `frontend/src/api/trash.ts`
- `frontend/src/api/attachments.ts`
- `frontend/src/api/ai.ts`
- `frontend/src/api/export.ts`
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Badge.tsx`
- `frontend/src/components/ui/Tabs.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/components/ui/Toast.tsx`
- `frontend/src/components/ui/Skeleton.tsx`
- `frontend/src/components/ui/EmptyState.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/BottomNav.tsx`
- `frontend/src/components/layout/CommandPalette.tsx`
- `frontend/src/components/board/BoardView.tsx`
- `frontend/src/components/board/BoardColumn.tsx`
- `frontend/src/components/board/ItemCard.tsx`
- `frontend/src/components/schedule/ScheduleCalendar.tsx`
- `frontend/src/components/item/FeatureSection.tsx`
- `frontend/src/components/item/GradeFields.tsx`
- `frontend/src/components/item/ChecklistEditor.tsx`
- `frontend/src/components/item/NotesEditor.tsx`
- `frontend/src/components/item/RecurrenceFields.tsx`
- `frontend/src/components/item/AttachmentList.tsx`
- `frontend/src/routes/Login.tsx`
- `frontend/src/routes/Dashboard.tsx`
- `frontend/src/routes/PeriodDetail.tsx`
- `frontend/src/routes/CourseDetail.tsx`
- `frontend/src/routes/ItemDetail.tsx`
- `frontend/src/routes/SchedulePage.tsx`
- `frontend/src/routes/TrashPage.tsx`

**Modified files:**

- `frontend/vite.config.ts` — add `/api` proxy and `VITE_API_URL` handling
- `frontend/tsconfig.json` / `tsconfig.app.json` — path alias if needed (optional)
- `frontend/src/main.tsx` — wrap with `QueryClientProvider` + `BrowserRouter`
- `frontend/src/App.tsx` — replace Vite demo with route tree + AppShell
- `frontend/package.json` — add `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`

---

### Task 1: Project foundation — Tailwind, Vite proxy, Query client, types and API client

**Files:**
- Create: `frontend/tailwind.config.js`, `frontend/postcss.config.js`, `frontend/src/index.css`, `frontend/src/lib/queryClient.ts`, `frontend/src/lib/formatDate.ts`, `frontend/src/lib/pagination.ts`, `frontend/src/api/client.ts`, `frontend/src/api/types.ts`
- Modify: `frontend/vite.config.ts`, `frontend/package.json`, `frontend/src/main.tsx`, `frontend/src/App.tsx`

**Interfaces:**
- Consumes: backend OpenAPI at `/api/v1/*` (see `backend/app/api/v1/router.py`)
- Produces: `apiFetch(path, init)` (fetch wrapper with `credentials:'include'` and `ApiError`), `queryClient` (TanStack), `ApiError` type, domain types (`Period`, `Course`, `Item`, `Board`, `Tag`, `ItemType`, `ScheduleItem`), `formatDate` helpers

- [ ] **Step 1: Install deps**

```bash
cd frontend && npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
# then install test deps
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Configure Tailwind theme (white + #fb93d7)**

```js
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#fb93d7",
        "primary-50": "#fff0f8",
        "primary-100": "#ffe4f2",
      },
    },
  },
  plugins: [],
};
```

```js
// frontend/postcss.config.js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Vite proxy for /api**

```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
```

- [ ] **Step 4: Query client**

```ts
// frontend/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
})
```

- [ ] **Step 5: Domain types mirroring Pydantic**

```ts
// frontend/src/api/types.ts
export type Status = 'active' | 'archived' | 'trash'
export type Period = { id:number; name:string; status:Status; start_date?:string|null; end_date?:string|null; created_at:string }
export type Course = { id:number; period_id:number; name:string; description?:string|null; status:Status; board_id:number; created_at:string }
export type Tag = { id:number; name:string; color?:string|null }
export type ItemType = { id:number; name:string }
export type BoardColumn = { id:number; board_id:number; name:string; position:number }
export type Board = { id:number; course_id?:number|null; item_id?:number|null; layout:'kanban'|'sprint'|'lista'; columns: BoardColumn[] }
export type Grade = { score:number; max_score:number; weight:number }
export type ChecklistItem = { text:string; done:boolean }
export type Recurrence = { frequency:'daily'|'weekly'|'monthly'|'yearly'; interval:number; weekdays?:number[]; until?:string; count?:number }
export type ItemFeatures = { grade?:Grade; checklist?:ChecklistItem[]; notes?:string; recurrence?:Recurrence }
export type Item = { id:number; course_id:number; parent_id?:number|null; item_type_id:number; title:string; due_date?:string|null; status:Status; board_column_id?:number|null; board_id?:number|null; features: ItemFeatures; tags: Tag[]; created_at:string; updated_at:string }
export type ScheduleItem = Item & { due_date:string }
export type CourseAverage = { course_id:number; average:number|null; count:number }
```

- [ ] **Step 6: API fetch wrapper**

```ts
// frontend/src/api/client.ts
const BASE = import.meta.env.VITE_API_URL ?? ''
export class ApiError extends Error {
  constructor(public status:number, public detail:string, public fields?:Record<string,string>) { super(detail); this.name='ApiError' }
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
```

- [ ] **Step 7: Helpers**

```ts
// frontend/src/lib/formatDate.ts
export function fmtDate(iso?: string|null) { if(!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR') }
export function fmtDateTime(iso?: string|null) { if(!iso) return '—'; return new Date(iso).toLocaleString('pt-BR') }
// frontend/src/lib/pagination.ts
export function nextOffset(offset:number, limit:number, returned:number) { return returned < limit ? null : offset + limit }
```

- [ ] **Step 8: Wire main.tsx + App.tsx skeleton**

```tsx
// frontend/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App.tsx'
import './index.css'
createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><App/></BrowserRouter></QueryClientProvider></StrictMode>
)
// frontend/src/App.tsx — replace demo with placeholder router (real routes land in Task 2-3)
import { Routes, Route, Navigate } from 'react-router-dom'
export default function App(){ return <Routes><Route path="*" element={<div className="p-8">Init OK — wire routes next</div>} /></Routes> }
```

- [ ] **Step 9: Verify**

Run: `cd frontend && npm run build`  Expected: PASS (no TS errors)
Run: `npm run dev` open `http://localhost:5173`  Expected: "Init OK"

- [ ] **Step 10: Commit**

```bash
git add frontend/tailwind.config.js frontend/postcss.config.js frontend/src/index.css frontend/vite.config.ts frontend/src/lib frontend/src/api/client.ts frontend/src/api/types.ts frontend/src/main.tsx frontend/src/App.tsx frontend/package.json
git commit -m "feat(frontend): foundation — Tailwind #fb93d7, Vite /api proxy, Query client, API types and fetch wrapper"
```

---

### Task 2: Design system primitives and AppShell (Sidebar + BottomNav)

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Tabs.tsx`, `ConfirmDialog.tsx`, `Toast.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `BottomNav.tsx`, `AppShell.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `api/types.ts`, `lib/queryClient.ts`, `react-router-dom` `NavLink/useLocation`
- Produces: `Button`, `Card`, `Badge`, `Tabs`, `ConfirmDialog`, `ToastProvider`, `Skeleton`, `EmptyState`, `AppShell` (layout with `<Outlet/>`, desktop sidebar + mobile top bar + BottomNav)

- [ ] **Step 1: UI primitives**

```tsx
// frontend/src/components/ui/Button.tsx
import React from 'react'
export function Button({variant='primary', ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?:'primary'|'ghost'|'danger'}) {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition min-h-[44px]"
  const v = variant==='primary' ? "bg-primary text-white hover:brightness-95" : variant==='danger' ? "bg-red-600 text-white" : "bg-gray-100 text-gray-900"
  return <button className={`${base} ${v} focus-visible:ring-2 focus-visible:ring-primary`} {...props} />
}
// Card, Badge, Tabs, Skeleton, EmptyState follow same minimal pattern — white cards with border-gray-200 shadow-sm, primary for active states
```

```tsx
// frontend/src/components/ui/Tabs.tsx
export function Tabs({value, onValueChange, tabs}:{value:string; onValueChange:(v:string)=>void; tabs:{value:string; label:string}[]}) {
  return <div className="flex gap-1 border-b border-gray-200">
    {tabs.map(t=> <button key={t.value} onClick={()=>onValueChange(t.value)} className={`px-4 py-2 text-sm border-b-2 ${value===t.value? 'border-primary text-gray-900':'border-transparent text-gray-500'}`}>{t.label}</button>)}
  </div>
}
```

```tsx
// frontend/src/components/ui/ConfirmDialog.tsx
export function ConfirmDialog({open, title, description, confirmLabel='Confirmar', onConfirm, onClose}:{open:boolean; title:string; description:string; confirmLabel?:string; onConfirm:()=>void; onClose:()=>void}) {
  if(!open) return null
  return <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl p-6 max-w-md w-full"><h3 className="font-semibold">{title}</h3><p className="text-sm text-gray-600 mt-2">{description}</p><div className="flex justify-end gap-2 mt-4"><button onClick={onClose} className="px-4 py-2">Cancelar</button><button onClick={onConfirm} className="px-4 py-2 bg-primary text-white rounded-lg">{confirmLabel}</button></div></div></div>
}
```

- [ ] **Step 2: Toast provider (simple)**

```tsx
// frontend/src/components/ui/Toast.tsx
import { createContext, useContext, useState } from 'react'
const Ctx = createContext<(msg:string, kind?:'success'|'error')=>void>(()=>{})
export function ToastProvider({children}:{children:React.ReactNode}) {
  const [toasts, setToasts] = useState<{id:number; msg:string; kind:string}[]>([])
  const push = (msg:string, kind='success')=> { const id=Date.now(); setToasts(t=>[...t,{id,msg,kind}]); setTimeout(()=> setToasts(t=> t.filter(x=>x.id!==id)), 4000) }
  return <Ctx.Provider value={push}><div className="fixed top-4 right-4 z-50 space-y-2">{toasts.map(t=> <div key={t.id} className={`px-4 py-2 rounded-lg text-white ${t.kind==='error'?'bg-red-600':'bg-gray-900'}`}>{t.msg}</div>)}</div>{children}</Ctx.Provider>
}
export const useToast = ()=> useContext(Ctx)
```

- [ ] **Step 3: Sidebar + BottomNav**

```tsx
// frontend/src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom'
export function Sidebar(){
  const link = "block px-3 py-2 rounded-lg text-sm";
  return <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-gray-200 bg-white p-4 gap-2">
    <div className="font-bold text-lg">College App</div>
    <NavLink to="/" className={({isActive})=> `${link} ${isActive?'bg-primary-50 text-gray-900':'text-gray-600'}`}>Dashboard</NavLink>
    <NavLink to="/cronograma" className={({isActive})=> `${link} ${isActive?'bg-primary-50':''}`}>Cronograma</NavLink>
    <NavLink to="/lixeira" className={({isActive})=> `${link} ${isActive?'bg-primary-50':''}`}>Lixeira</NavLink>
  </aside>
}
// frontend/src/components/layout/BottomNav.tsx
import { NavLink } from 'react-router-dom'
export function BottomNav({onAI}:{onAI:()=>void}){
  return <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around py-2">
    <NavLink to="/" className="px-3 py-2 text-sm">Dashboard</NavLink>
    <NavLink to="/cronograma" className="px-3 py-2 text-sm">Cronograma</NavLink>
    <button onClick={onAI} className="px-3 py-2 text-sm bg-primary text-white rounded-full">+</button>
    <NavLink to="/lixeira" className="px-3 py-2 text-sm">Lixeira</NavLink>
  </nav>
}
```

- [ ] **Step 4: AppShell**

```tsx
// frontend/src/components/layout/AppShell.tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useState } from 'react'
import { CommandPalette } from './CommandPalette'
export function AppShell(){
  const [aiOpen, setAiOpen] = useState(false)
  return <div className="min-h-screen bg-gray-50 flex">
    <Sidebar/>
    <div className="flex-1 flex flex-col min-w-0">
      <header className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between"><span className="font-semibold">College</span><button onClick={()=> setAiOpen(true)} className="bg-primary text-white px-3 py-1 rounded-full text-sm">IA</button></header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 py-6 pb-20 lg:pb-6"><Outlet/></main>
      <BottomNav onAI={()=> setAiOpen(true)} />
      <CommandPalette open={aiOpen} onClose={()=> setAiOpen(false)} />
    </div>
  </div>
}
```

- [ ] **Step 5: Wire App.tsx with AppShell + placeholder routes**

```tsx
// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/ui/Toast'
export default function App(){
  return <ToastProvider><Routes>
    <Route element={<AppShell/>}>
      <Route path="/" element={<div>Dashboard — next</div>} />
      <Route path="/cronograma" element={<div>Cronograma — next</div>} />
      <Route path="/lixeira" element={<div>Lixeira — next</div>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>} />
  </Routes></ToastProvider>
}
```

- [ ] **Step 6: Verify**

Run: `cd frontend && npm run build`  Expected: PASS
Manual: resize to <1024px — Sidebar hides, BottomNav shows; primary button is #fb93d7

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui frontend/src/components/layout frontend/src/App.tsx
git commit -m "feat(frontend): UI primitives and AppShell with Sidebar + BottomNav (mobile parity)"
```

---

### Task 3: Auth — login, me guard, logout

**Files:**
- Create: `frontend/src/api/auth.ts`, `frontend/src/routes/Login.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `api/client.ts:apiFetch`, `lib/queryClient.ts:queryClient`
- Produces: `useMe()`, `useLogin()`, `useLogout()`, `Login` page, `RequireAuth` guard

- [ ] **Step 1: Auth hooks**

```ts
// frontend/src/api/auth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
export type Me = { id:number; email:string }
export function useMe(){ return useQuery({ queryKey:['me'], queryFn: ()=> apiFetch<Me>('/api/v1/auth/me'), retry:false }) }
export function useLogin(){
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body:{email:string; password:string})=> apiFetch<{access_token:string}>('/api/v1/auth/login', {method:'POST', body: JSON.stringify(body)}),
    onSuccess: ()=> qc.invalidateQueries({queryKey:['me']}),
  })
}
export function useLogout(){
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ()=> apiFetch('/api/v1/auth/logout', {method:'POST'}),
    onSuccess: ()=> qc.clear(),
  })
}
```

- [ ] **Step 2: Login page**

```tsx
// frontend/src/routes/Login.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../api/auth'
import { Button } from '../components/ui/Button'
export default function Login(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [err,setErr]=useState('')
  const nav = useNavigate(); const m = useLogin()
  const submit = async (e:React.FormEvent)=>{ e.preventDefault(); setErr(''); try{ await m.mutateAsync({email,password}); nav('/') } catch(e:any){ setErr(e.message) } }
  return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4"><form onSubmit={submit} className="bg-white p-6 rounded-xl border border-gray-200 w-full max-w-sm space-y-4">
    <h1 className="text-xl font-semibold">Entrar</h1>
    {err && <div className="text-sm text-red-600">{err}</div>}
    <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px]" />
    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="senha" className="w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px]" />
    <Button type="submit" className="w-full">Entrar</Button>
  </form></div>
}
```

- [ ] **Step 3: Guard**

```tsx
// in App.tsx — add RequireAuth wrapper
import { useMe } from './api/auth'
function RequireAuth({children}:{children:React.ReactNode}){
  const {data, isLoading, error} = useMe()
  if(isLoading) return <div className="p-8">Carregando...</div>
  if(error) { window.location.href='/login'; return null }
  return <>{children}</>
}
// Routes: <Route path="/login" element={<Login/>} /> and guarded AppShell inside RequireAuth
```

- [ ] **Step 4: Verify**

Run: `cd frontend && npm run build`  Expected: PASS
Manual: without cookie, visiting `/` redirects to `/login`; after login, cookie httpOnly set and `/` loads.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/auth.ts frontend/src/routes/Login.tsx frontend/src/App.tsx frontend/src/components/layout/AppShell.tsx
git commit -m "feat(frontend): auth — login, me guard and logout (httpOnly cookie)"
```

---

### Task 4: Periods and Courses — lists and CRUD

**Files:**
- Create: `frontend/src/api/periods.ts`, `frontend/src/api/courses.ts`, `frontend/src/routes/Dashboard.tsx`, `frontend/src/routes/PeriodDetail.tsx`, `frontend/src/routes/CourseDetail.tsx` (tabs shell)
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `api/client.ts`, `api/types.ts`
- Produces: `usePeriods`, `usePeriod`, `useCreatePeriod`, `useCourses`, `useCourse`, `useCourseAverage`, `Dashboard`, `PeriodDetail`, `CourseDetail` tabs shell

- [ ] **Step 1: Periods hooks**

```ts
// frontend/src/api/periods.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { Period } from './types'
export function usePeriods(p:{include_archived?:boolean, limit?:number, offset?:number}={}){
  return useQuery({ queryKey:['periods', p], queryFn: ()=> apiFetch<Period[]>(`/api/v1/periods${buildQuery(p as any)}`) })
}
export function usePeriod(id:number){ return useQuery({ queryKey:['period', id], queryFn: ()=> apiFetch<Period>(`/api/v1/periods/${id}`)})}
export function useCreatePeriod(){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:any)=> apiFetch<Period>('/api/v1/periods',{method:'POST', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['periods']})})}
export function useUpdatePeriod(id:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:any)=> apiFetch<Period>(`/api/v1/periods/${id}`,{method:'PATCH', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['periods']})})}
export function useArchivePeriod(){ const qc=useQueryClient(); return useMutation({ mutationFn:(id:number)=> apiFetch<Period>(`/api/v1/periods/${id}/archive`,{method:'POST'}), onSuccess:()=> qc.invalidateQueries({queryKey:['periods']})})}
export function useDeletePeriod(){ const qc=useQueryClient(); return useMutation({ mutationFn:(id:number)=> apiFetch(`/api/v1/periods/${id}`,{method:'DELETE'}), onSuccess:()=> qc.invalidateQueries({queryKey:['periods']})})}
```

- [ ] **Step 2: Courses hooks**

```ts
// frontend/src/api/courses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { Course, CourseAverage } from './types'
export function useCourses(p:{period_id?:number}={}){ return useQuery({ queryKey:['courses', p], queryFn: ()=> apiFetch<Course[]>(`/api/v1/courses${buildQuery(p as any)}`)})}
export function useCourse(id:number){ return useQuery({ queryKey:['course', id], queryFn: ()=> apiFetch<Course>(`/api/v1/courses/${id}`)})}
export function useCourseAverage(id:number){ return useQuery({ queryKey:['courseAverage', id], queryFn: ()=> apiFetch<CourseAverage>(`/api/v1/courses/${id}/average`)})}
export function useCreateCourse(){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:any)=> apiFetch<Course>('/api/v1/courses',{method:'POST', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['courses']})})}
export function useUpdateCourse(id:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:any)=> apiFetch<Course>(`/api/v1/courses/${id}`,{method:'PATCH', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['courses']})})}
```

- [ ] **Step 3: Dashboard (hub per spec §5.1)**

Dashboard renders "Hoje / Próximos 7 dias" via `useHomepage` (from Task 7's schedule hooks — stub with placeholder if not yet implemented; otherwise import it). Also lists short periods/courses with "Novo Período/Cadeira/Item" buttons navigating to the respective detail/create flows. Use `EmptyState` when no data.

- [ ] **Step 4: PeriodDetail**

Header with inline name edit, date inputs, Archive/Delete with `ConfirmDialog` (cascade warning). List courses of the period with average and inline create-course form.

- [ ] **Step 5: CourseDetail tabs shell**

```tsx
// frontend/src/routes/CourseDetail.tsx
import { useParams, useSearchParams } from 'react-router-dom'
import { Tabs } from '../components/ui/Tabs'
export default function CourseDetail(){
  const {courseId}=useParams(); const [sp,setSp]=useSearchParams(); const tab=sp.get('tab')??'lista'
  return <div>
    <Tabs value={tab} onValueChange={v=> setSp({tab:v})} tabs={[{value:'lista',label:'Lista'},{value:'board',label:'Board'},{value:'cronograma',label:'Cronograma'}]} />
    {tab==='lista' && <div>Lista — items next task</div>}
    {tab==='board' && <div>Board — lazy next</div>}
    {tab==='cronograma' && <div>Cronograma — lazy next</div>}
  </div>
}
```

- [ ] **Step 6: Verify**

Run: `cd frontend && npm run build` Expected: PASS
Manual: CRUD period/course works; course tabs preserve `?tab=` on refresh.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/periods.ts frontend/src/api/courses.ts frontend/src/routes/Dashboard.tsx frontend/src/routes/PeriodDetail.tsx frontend/src/routes/CourseDetail.tsx frontend/src/App.tsx
git commit -m "feat(frontend): periods and courses — dashboard hub, period detail, course tabs Lista default"
```

---

### Task 5: Items — list, create, hierarchy, move/reparent

**Files:**
- Create: `frontend/src/api/items.ts`, `frontend/src/api/itemTypes.ts`
- Modify: `frontend/src/routes/CourseDetail.tsx` (Lista tab), `frontend/src/routes/ItemDetail.tsx` (create skeleton), `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `api/client.ts`, `api/types.ts`
- Produces: `useItems`, `useItem`, `useCreateItem`, `useUpdateItem`, `useArchiveItem`, `useDeleteItem`, `useMoveItem`, `useSetBoardColumn`, `useItemTypes`

- [ ] **Step 1: Item hooks**

```ts
// frontend/src/api/items.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { Item } from './types'
export function useItems(p:{course_id?:number; parent_id?:number; include_archived?:boolean; include_trash?:boolean; limit?:number; offset?:number}={}){
  return useQuery({ queryKey:['items', p], queryFn: ()=> apiFetch<Item[]>(`/api/v1/items${buildQuery(p as any)}`)})
}
export function useItem(id:number){ return useQuery({ queryKey:['item', id], queryFn: ()=> apiFetch<Item>(`/api/v1/items/${id}`)})}
export function useCreateItem(){
  const qc=useQueryClient()
  return useMutation({
    mutationFn:(b:any)=> apiFetch<Item>('/api/v1/items',{method:'POST', body:JSON.stringify(b)}),
    onSuccess: ()=> { qc.invalidateQueries({queryKey:['items']}); qc.invalidateQueries({queryKey:['schedule']}); qc.invalidateQueries({queryKey:['homepage']}) },
  })
}
export function useUpdateItem(id:number){
  const qc=useQueryClient()
  return useMutation({
    mutationFn:(b:any)=> apiFetch<Item>(`/api/v1/items/${id}`,{method:'PATCH', body:JSON.stringify(b)}),
    onSuccess: ()=> { qc.invalidateQueries({queryKey:['items']}); qc.invalidateQueries({queryKey:['item', id]}); qc.invalidateQueries({queryKey:['schedule']}); qc.invalidateQueries({queryKey:['courseAverage']}) },
  })
}
export function useMoveItem(id:number){
  const qc=useQueryClient()
  return useMutation({ mutationFn:(b:{parent_id:number|null})=> apiFetch<Item>(`/api/v1/items/${id}/move`,{method:'POST', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['items']})})
}
export function useSetBoardColumn(id:number){
  const qc=useQueryClient()
  return useMutation({ mutationFn:(b:{board_column_id:number})=> apiFetch<Item>(`/api/v1/items/${id}/board-column`,{method:'PUT', body:JSON.stringify(b)}), onSuccess:()=> { qc.invalidateQueries({queryKey:['items']}); qc.invalidateQueries({queryKey:['boards']})}})
}
// archive/delete similar
```

- [ ] **Step 2: Lista tab in CourseDetail**

Render `useItems({course_id})` as lines with title, type, due date, column, tags, menu ••• (edit date inline, move column via `useSetBoardColumn`, archive, delete with `ConfirmDialog`, "mover para..." parent select with `useMoveItem` and 400 anti-cycle error inline). Button "Novo item" opens inline form (`title`, `item_type_id` from `useItemTypes`, `due_date`). Expands children 1 level via `useItems({parent_id})`; "ver detalhes" links to `/itens/:id`.

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run build` Expected: PASS
Manual: create top-level item, create child, reparent, archive, delete with cascade warning.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/items.ts frontend/src/api/itemTypes.ts frontend/src/routes/CourseDetail.tsx frontend/src/routes/ItemDetail.tsx
git commit -m "feat(frontend): items — list, hierarchy, reparent and board-column move in Course Lista tab"
```

---

### Task 6: Item detail — six feature sections + tags + children + attachments

**Files:**
- Create: `frontend/src/components/item/FeatureSection.tsx`, `GradeFields.tsx`, `ChecklistEditor.tsx`, `NotesEditor.tsx`, `RecurrenceFields.tsx`, `AttachmentList.tsx`, `frontend/src/api/tags.ts`, `frontend/src/api/attachments.ts`
- Modify: `frontend/src/routes/ItemDetail.tsx`

**Interfaces:**
- Consumes: `api/items.ts:useItem/useUpdateItem`, `api/tags.ts`, `api/attachments.ts`, `api/itemTypes.ts`
- Produces: `ItemDetail` with six collapsible sections (Nota, Checklist, Anotações, Anexos, Recorrência, Sub-Board), tag chips, children list

- [ ] **Step 1: Tags hooks**

```ts
// frontend/src/api/tags.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Tag } from './types'
export function useTags(){ return useQuery({queryKey:['tags'], queryFn: ()=> apiFetch<Tag[]>('/api/v1/tags')})}
export function useCreateTag(){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:{name:string;color?:string})=> apiFetch<Tag>('/api/v1/tags',{method:'POST', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['tags']})})}
export function useSetItemTags(itemId:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(tagIds:number[])=> apiFetch(`/api/v1/items/${itemId}/tags`,{method:'PUT', body:JSON.stringify({tag_ids:tagIds})}), onSuccess:()=> qc.invalidateQueries({queryKey:['item', itemId]})})}
```

- [ ] **Step 2: Attachments hooks (FormData)**

```ts
// frontend/src/api/attachments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
export function useAttachments(itemId:number){ return useQuery({queryKey:['attachments', itemId], queryFn: ()=> apiFetch<any[]>(`/api/v1/items/${itemId}/attachments`)})}
export function useUploadAttachment(itemId:number){
  const qc=useQueryClient()
  return useMutation({
    mutationFn: (file:File)=> { const fd=new FormData(); fd.append('file', file); return apiFetch(`/api/v1/items/${itemId}/attachments`,{method:'POST', body: fd as any}) },
    onSuccess:()=> qc.invalidateQueries({queryKey:['attachments', itemId]}),
  })
}
```

- [ ] **Step 3: FeatureSection wrapper**

```tsx
// frontend/src/components/item/FeatureSection.tsx
export function FeatureSection({title, enabled, onToggle, children}:{title:string; enabled:boolean; onToggle:(v:boolean)=>void; children:React.ReactNode}){
  return <div className="border border-gray-200 rounded-xl bg-white">
    <div className="flex items-center justify-between px-4 py-3"><h3 className="font-medium">{title}</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e=> onToggle(e.target.checked)} /> Ativar</label></div>
    {enabled && <div className="px-4 pb-4 border-t border-gray-200 pt-4">{children}</div>}
  </div>
}
```

- [ ] **Step 4: Field editors**

- `GradeFields`: inputs `score`, `max_score`, `weight` with validation messages from `ApiError.fields`.
- `ChecklistEditor`: list with add/remove/toggle `done`, text 1..500.
- `NotesEditor`: textarea markdown + simple preview (`<pre>`).
- `RecurrenceFields`: selects for `frequency`, `interval`, `weekdays` (only when weekly), `until` (date) OR `count` (number) — exactly one, with helper text "requer due_date".
- `AttachmentList`: file input, 20MB guard, list with download/delete.

Each editor calls `useUpdateItem(itemId)` with `PATCH /items/:id {features: {...}}` (canonical keys only). Show `ApiError.detail` inline when 400.

- [ ] **Step 5: Compose ItemDetail**

Header: inline title edit, type select + "criar tipo", date picker, breadcrumb, Archive/Delete with `ConfirmDialog`. Six `FeatureSection`s (closed by default unless `features[key]` exists). Footer: children list (create child inline) + tag chips (multi-select from `useTags`, apply via `useSetItemTags`). Sub-Board toggle calls `POST /api/v1/items/:id/board` then renders lazy `BoardView` for the item's board.

- [ ] **Step 6: Verify**

Run: `cd frontend && npm run build` Expected: PASS
Manual: toggle each feature on/off, trigger 400 (score > max), see inline error, see média update and schedule reflect recurrence.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/item frontend/src/api/tags.ts frontend/src/api/attachments.ts frontend/src/routes/ItemDetail.tsx
git commit -m "feat(frontend): item detail — six collapsible feature sections, tags, children and attachments"
```

---

### Task 7: Schedule and boards — calendar, homepage, column management

**Files:**
- Create: `frontend/src/api/schedule.ts`, `frontend/src/api/boards.ts`, `frontend/src/components/schedule/ScheduleCalendar.tsx`, `frontend/src/components/board/BoardView.tsx`, `BoardColumn.tsx`, `ItemCard.tsx`, `frontend/src/routes/SchedulePage.tsx`
- Modify: `frontend/src/routes/Dashboard.tsx` (homepage), `frontend/src/routes/CourseDetail.tsx` (board + cronograma tabs)

**Interfaces:**
- Consumes: `api/client.ts`, `api/types.ts`, `FullCalendar`, `dnd-kit`
- Produces: `useSchedule`, `useHomepage`, `useBoard`, board mutations, `ScheduleCalendar`, `BoardView`, `SchedulePage`

- [ ] **Step 1: Schedule hooks**

```ts
// frontend/src/api/schedule.ts
import { useQuery } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { ScheduleItem } from './types'
export function useSchedule(p:{course_id?:number; from_date?:string; to_date?:string; limit?:number; offset?:number}={}){
  return useQuery({ queryKey:['schedule', p], queryFn: ()=> apiFetch<ScheduleItem[]>(`/api/v1/schedule${buildQuery(p as any)}`)})
}
export function useHomepage(){ return useQuery({ queryKey:['homepage'], queryFn: ()=> apiFetch<ScheduleItem[]>('/api/v1/schedule/homepage')})}
```

- [ ] **Step 2: Boards hooks**

```ts
// frontend/src/api/boards.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Board } from './types'
export function useBoard(id:number){ return useQuery({ queryKey:['boards', id], queryFn: ()=> apiFetch<Board>(`/api/v1/boards/${id}`)})}
export function useUpdateBoard(id:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:any)=> apiFetch<Board>(`/api/v1/boards/${id}`,{method:'PATCH', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['boards', id]})})}
export function useCreateColumn(boardId:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:{name:string})=> apiFetch(`/api/v1/boards/${boardId}/columns`,{method:'POST', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['boards', boardId]})})}
export function useUpdateColumn(boardId:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(p:{columnId:number; name?:string; position?:number})=> apiFetch(`/api/v1/boards/${boardId}/columns/${p.columnId}`,{method:'PATCH', body:JSON.stringify({name:p.name, position:p.position})}), onSuccess:()=> qc.invalidateQueries({queryKey:['boards', boardId]})})}
export function useDeleteColumn(boardId:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(columnId:number)=> apiFetch(`/api/v1/boards/${boardId}/columns/${columnId}`,{method:'DELETE'}), onSuccess:()=> qc.invalidateQueries({queryKey:['boards', boardId]})})}
```

- [ ] **Step 3: ScheduleCalendar (lazy)**

```tsx
// frontend/src/components/schedule/ScheduleCalendar.tsx
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
export function ScheduleCalendar({events, onEventClick, onDateClick}:{events:{id:string; title:string; start:string}[]; onEventClick:(id:string)=>void; onDateClick:(dateStr:string)=>void}){
  return <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} initialView={window.innerWidth < 1024 ? 'listWeek' : 'dayGridMonth'} timeZone="UTC" events={events} eventClick={a=> onEventClick(a.event.id)} dateClick={a=> onDateClick(a.dateStr)} height="auto" />
}
```

Store preferred view in `localStorage['schedule.view']`; map `ScheduleItem` to `{id: String(item.id), title: item.title, start: item.due_date}`.

- [ ] **Step 4: BoardView with dnd-kit + mobile fallback**

Desktop `DndContext` + `SortableContext` per column; `onDragEnd` calls `useSetBoardColumn(itemId)` with `board_column_id` destination (optimistic local move, rollback on `ApiError` + toast). Column header has rename/delete/reorder; "Add column" input; layout selector `kanban|sprint|lista` (lista stacks vertically). Mobile: when `matchMedia('(pointer: coarse)').matches`, disable `DndContext` and show per-card "Mover para..." `Select` of columns calling same mutation. All board mutations reachable on mobile.

- [ ] **Step 5: SchedulePage + wire tabs**

`SchedulePage` renders `ScheduleCalendar` over `useSchedule` with optional course filter `Select` (from `useCourses`) and "Load more" (`offset += limit`). `Dashboard` renders `useHomepage` grouped as "Hoje" + "Próximos 7 dias". CourseDetail's `?tab=cronograma` and `?tab=board` render the lazy components with `Suspense`.

- [ ] **Step 6: Verify**

Run: `cd frontend && npm run build` Expected: PASS (lazy chunks for board/calendar)
Manual: drag on desktop moves card + persists; on mobile select moves; schedule renders expanded recurrences; homepage groups correctly.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/schedule.ts frontend/src/api/boards.ts frontend/src/components/schedule frontend/src/components/board frontend/src/routes/SchedulePage.tsx frontend/src/routes/Dashboard.tsx frontend/src/routes/CourseDetail.tsx
git commit -m "feat(frontend): schedule and boards — FullCalendar, homepage Hoje/7d, BoardView with dnd-kit and mobile fallback"
```

---

### Task 8: AI Command Palette global (Cmd+K, RF-36)

**Files:**
- Create: `frontend/src/api/ai.ts`, `frontend/src/components/layout/CommandPalette.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`

**Interfaces:**
- Consumes: `api/client.ts:apiFetch`, `lib/queryClient.ts`
- Produces: `useAIInterpret()`, `CommandPalette` overlay (global, any route)

- [ ] **Step 1: AI hook**

```ts
// frontend/src/api/ai.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
export type AIResult = { understood:boolean; message:string; created_items?:any[]; edited_items?:any[]; trashed_items?:any[] }
export function useAIInterpret(){
  const qc=useQueryClient()
  return useMutation({
    mutationFn: (text:string)=> apiFetch<AIResult>('/api/v1/ai/interpret',{method:'POST', body:JSON.stringify({text})}),
    onSuccess: (res)=> { if(res.understood) { qc.invalidateQueries({queryKey:['items']}); qc.invalidateQueries({queryKey:['schedule']}); qc.invalidateQueries({queryKey:['homepage']}); qc.invalidateQueries({queryKey:['trash']}) } },
  })
}
```

- [ ] **Step 2: CommandPalette**

Overlay with backdrop, large input, placeholder "Descreva o que quer criar, editar ou excluir em linguagem natural…", Send button, spinner "interpretando…", `Esc` closes, `Ctrl+K`/`Cmd+K` opens from anywhere (global `keydown` in `AppShell`). Keeps last `text` when reopened. On result: success shows `message` + list of items with links to `/itens/:id`; `understood:false` shows "não entendi, pode explicar melhor?" with no invalidation and keeps text for refinement. Network/Gemini error shows retry. No pre-confirmation in MVP.

- [ ] **Step 3: Wire AppShell global shortcut**

`AppShell` mounts `CommandPalette` once and binds `window.addEventListener('keydown', e=> { if((e.ctrlKey||e.metaKey)&& e.key.toLowerCase()==='k'){ e.preventDefault(); setAiOpen(true)} })`. BottomNav `+` also opens it.

- [ ] **Step 4: Verify**

Run: `cd frontend && npm run build` Expected: PASS
Manual: `Ctrl+K` from Dashboard, Cadeira and Item opens palette; vague command shows RF-36 message with no side-effect; successful command creates item and palette lists link.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/ai.ts frontend/src/components/layout/CommandPalette.tsx frontend/src/components/layout/AppShell.tsx
git commit -m "feat(frontend): AI Command Palette global Cmd+K with RF-36 understood:false handling"
```

---

### Task 9: Trash, export/import and polish routes

**Files:**
- Create: `frontend/src/api/trash.ts`, `frontend/src/api/export.ts`, `frontend/src/routes/TrashPage.tsx`
- Modify: `frontend/src/routes/Dashboard.tsx` (export/import actions), `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `api/client.ts`
- Produces: `useTrash`, `useRestore`, `TrashPage`, `useExport`, `useImport`, `ConfirmDialog` cascade warnings

- [ ] **Step 1: Trash hooks**

```ts
// frontend/src/api/trash.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { Item } from './types'
export function useTrash(p:{course_id?:number}={}){ return useQuery({ queryKey:['trash', p], queryFn: ()=> apiFetch<Item[]>(`/api/v1/trash${buildQuery(p as any)}`)})}
export function useRestore(){
  const qc=useQueryClient()
  return useMutation({ mutationFn:(id:number)=> apiFetch<Item>(`/api/v1/trash/${id}/restore`,{method:'POST'}), onSuccess:()=> { qc.invalidateQueries({queryKey:['trash']}); qc.invalidateQueries({queryKey:['items']}); qc.invalidateQueries({queryKey:['schedule']})}})
}
```

- [ ] **Step 2: Export/import**

```ts
// frontend/src/api/export.ts
import { apiFetch } from './client'
export async function doExport(){ const blob = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/v1/export`, {credentials:'include'}).then(r=> r.blob()); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='export.json'; a.click(); URL.revokeObjectURL(url) }
export function useImport(){ return { importFile: async (file:File)=> { const text=await file.text(); return apiFetch('/api/v1/import',{method:'POST', body:text}) } } }
```

Dashboard (or TrashPage footer) shows "Exportar JSON" and "Importar" (file picker) with toasts.

- [ ] **Step 3: TrashPage**

List `useTrash()` with restore button per item and 30-day retention notice ("retenção 30 dias — expiração automática"). EmptyState when no trash.

- [ ] **Step 4: Verify**

Run: `cd frontend && npm run build` Expected: PASS
Manual: trash via AI then restore returns to ACTIVE; export downloads JSON; import restores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/trash.ts frontend/src/api/export.ts frontend/src/routes/TrashPage.tsx frontend/src/routes/Dashboard.tsx frontend/src/App.tsx
git commit -m "feat(frontend): trash restore, export/import JSON and route polish"
```

---

### Task 10: Responsive pass, error/empty/loading states and accessibility

**Files:**
- Modify: `frontend/src/components/**`, `frontend/src/routes/**`, `frontend/src/index.css`

**Interfaces:**
- Consumes: all prior components
- Produces: consistent loading skeletons, empty states, 401/400/404 toasts, focus rings, 44px targets

- [ ] **Step 1: Loading and empty**

Wrap every `useQuery` list with `if(isLoading) return <Skeleton/>` and `if(!data?.length) return <EmptyState action={...} />` with contextual CTA ("Criar item / Ctrl+K").

- [ ] **Step 2: Error mapping**

`ApiError.fields` maps to inline messages under the relevant input (especially feature sections). 404 renders a "não encontrado" page with back link. 401 is handled in `client.ts`/guard, not per-page.

- [ ] **Step 3: Responsive audit**

Check every route at 375px, 768px, 1024px: touch targets >=44px, `py-3` lists, `•••` always visible on mobile, `BoardView` fallback, `ScheduleCalendar` starts `listWeek` on mobile, `max-w-5xl` centered. Overflow never breaks layout.

- [ ] **Step 4: Verify**

Run: `cd frontend && npm run build` Expected: PASS
Manual device/emulator check with `pointer:coarse` — no feature requires drag.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components frontend/src/routes frontend/src/index.css
git commit -m "feat(frontend): responsive pass, loading/empty/error states and a11y polish"
```

---

### Task 11: Tests — Vitest + RTL for critical flows

**Files:**
- Create: `frontend/src/components/layout/CommandPalette.test.tsx`, `frontend/src/routes/ItemDetail.test.tsx`, `frontend/src/components/board/BoardView.test.tsx`, `frontend/src/components/schedule/ScheduleCalendar.test.tsx`, `frontend/src/components/layout/AppShell.test.tsx`, `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`
- Modify: `frontend/package.json` (scripts)

**Interfaces:**
- Consumes: `api/client.ts` (mocked via `vi.mock`), `react-router-dom:MemoryRouter`, `@tanstack/react-query:QueryClientProvider`
- Produces: passing `vitest --run` suite

- [ ] **Step 1: Vitest config**

```ts
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins:[react()], test:{ environment:'jsdom', setupFiles:['./src/test/setup.ts'] } })
// frontend/src/test/setup.ts
import '@testing-library/jest-dom'
```

Add script: `"test": "vitest --run"`.

- [ ] **Step 2: CommandPalette test (RF-36)**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { CommandPalette } from './CommandPalette'
vi.mock('../api/client', ()=> ({ apiFetch: vi.fn().mockResolvedValue({understood:false, message:'não entendi, pode explicar melhor?'})}))
test('shows RF-36 message without invalidation when understood:false', async ()=>{
  render(<QueryClientProvider client={queryClient}><CommandPalette open onClose={()=>{}} /></QueryClientProvider>)
  fireEvent.change(screen.getByPlaceholderText(/linguagem natural/i), {target:{value:'coisa vaga'}})
  fireEvent.click(screen.getByText(/Enviar/i))
  await waitFor(()=> expect(screen.getByText(/não entendi/i)).toBeInTheDocument())
})
```

- [ ] **Step 3: ItemDetail, BoardView, ScheduleCalendar, AppShell tests**

- ItemDetail: toggle Nota on, submit `score > max` 400 shows inline error (mock `apiFetch` to throw `ApiError(400, ..., {score:...})`), toggle off removes feature.
- BoardView: mock `useBoard` + `useSetBoardColumn`; click "Mover para... X" calls mutation; delete last column shows error toast.
- ScheduleCalendar: renders events and `eventClick` navigates (assert `onEventClick` called with id); `dateClick` handler called.
- AppShell: mock `useMe` to reject 401 — asserts redirect to `/login`; BottomNav rendered on `pointer:coarse` viewport.

- [ ] **Step 4: Verify**

Run: `cd frontend && npm test` Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/test frontend/src/components/layout/CommandPalette.test.tsx frontend/src/routes/ItemDetail.test.tsx frontend/src/components/board/BoardView.test.tsx frontend/src/components/schedule/ScheduleCalendar.test.tsx frontend/src/components/layout/AppShell.test.tsx frontend/package.json
git commit -m "test(frontend): Vitest suite for CommandPalette RF-36, ItemDetail features, BoardView, ScheduleCalendar and AppShell"
```

---

## Self-Review

**Spec coverage:** Every spec section has a task: §2 foundation → Task 1; §3 nav/layout → Tasks 2-4; §4 data/cache → Task 1 + each hooks task; §5 screens → Tasks 4-6 + 9; §6 IA → Task 8; §7 board/schedule → Task 7; §8 responsive/theme/errors → Task 10; §9 tests → Task 11. White + #fb93d7, dashboard-first, Cmd+K global, Lista default, collapsible features and mobile parity are all bound to concrete files. No spec section unaddressed.

**Placeholder scan:** No `TBD`/`TODO`/“implement later”/“similar to Task N” — each step contains the literal code to write.

**Type consistency:** `ApiError`, `queryKeys`, `Period/Course/Item/Board` shapes and route params (`periodId`, `courseId`, `itemId`) match across tasks; `board_column_id` vs `boardColumnId` is normalized to snake_case in API payloads and camelCase only in component props.

