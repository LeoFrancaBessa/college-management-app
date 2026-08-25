import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { Item } from './types'
export function useItems(p:{course_id?:number; parent_id?:number; include_archived?:boolean; include_trash?:boolean; limit?:number; offset?:number}={}, opts:{enabled?:boolean}={}){
  return useQuery({ queryKey:['items', p], queryFn: ()=> apiFetch<Item[]>(`/api/v1/items${buildQuery(p as any)}`), enabled: opts.enabled ?? true })
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
export function useArchiveItem(){
  const qc=useQueryClient()
  return useMutation({ mutationFn:(id:number)=> apiFetch<Item>(`/api/v1/items/${id}/archive`,{method:'POST'}), onSuccess:()=> qc.invalidateQueries({queryKey:['items']})})
}
export function useDeleteItem(){
  const qc=useQueryClient()
  return useMutation({ mutationFn:(id:number)=> apiFetch<void>(`/api/v1/items/${id}`,{method:'DELETE'}), onSuccess:()=> qc.invalidateQueries({queryKey:['items']})})
}
