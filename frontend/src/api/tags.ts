import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Tag } from './types'
export function useTags(){ return useQuery({queryKey:['tags'], queryFn: ()=> apiFetch<Tag[]>('/api/v1/tags')})}
export function useCreateTag(){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:{name:string;color?:string})=> apiFetch<Tag>('/api/v1/tags',{method:'POST', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['tags']})})}
export function useSetItemTags(itemId:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(tagIds:number[])=> apiFetch(`/api/v1/items/${itemId}/tags`,{method:'PUT', body:JSON.stringify({tag_ids:tagIds})}), onSuccess:()=> qc.invalidateQueries({queryKey:['item', itemId]})})}
