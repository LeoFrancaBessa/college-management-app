import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Board } from './types'
export function useBoard(id:number){ return useQuery({ queryKey:['boards', id], queryFn: ()=> apiFetch<Board>(`/api/v1/boards/${id}`)})}
export function useUpdateBoard(id:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:any)=> apiFetch<Board>(`/api/v1/boards/${id}`,{method:'PATCH', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['boards', id]})})}
export function useCreateColumn(boardId:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:{name:string})=> apiFetch(`/api/v1/boards/${boardId}/columns`,{method:'POST', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['boards', boardId]})})}
export function useUpdateColumn(boardId:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(p:{columnId:number; name?:string; position?:number})=> apiFetch(`/api/v1/boards/${boardId}/columns/${p.columnId}`,{method:'PATCH', body:JSON.stringify({name:p.name, position:p.position})}), onSuccess:()=> qc.invalidateQueries({queryKey:['boards', boardId]})})}
export function useDeleteColumn(boardId:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(columnId:number)=> apiFetch(`/api/v1/boards/${boardId}/columns/${columnId}`,{method:'DELETE'}), onSuccess:()=> qc.invalidateQueries({queryKey:['boards', boardId]})})}
