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
