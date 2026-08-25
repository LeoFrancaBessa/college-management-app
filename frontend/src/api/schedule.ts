import { useQuery } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { ScheduleItem } from './types'
export function useSchedule(p:{course_id?:number; from_date?:string; to_date?:string; limit?:number; offset?:number}={}){
  return useQuery({ queryKey:['schedule', p], queryFn: ()=> apiFetch<ScheduleItem[]>(`/api/v1/schedule${buildQuery(p as any)}`)})
}
export function useHomepage(){ return useQuery({ queryKey:['homepage'], queryFn: ()=> apiFetch<ScheduleItem[]>('/api/v1/schedule/homepage')})}
