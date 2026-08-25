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
export function useDeleteAttachment(){
  const qc=useQueryClient()
  return useMutation({
    mutationFn: (attachmentId:number)=> apiFetch(`/api/v1/attachments/${attachmentId}`,{method:'DELETE'}),
    onSuccess:()=> qc.invalidateQueries({queryKey:['attachments']}),
  })
}
export function getAttachmentDownloadUrl(attachmentId:number){
  return `/api/v1/attachments/${attachmentId}`
}
