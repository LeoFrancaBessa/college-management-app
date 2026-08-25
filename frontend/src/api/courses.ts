import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, buildQuery } from './client'
import type { Course, CourseAverage } from './types'
export function useCourses(p:{period_id?:number}={}){ return useQuery({ queryKey:['courses', p], queryFn: ()=> apiFetch<Course[]>(`/api/v1/courses${buildQuery(p as any)}`)})}
export function useCourse(id:number){ return useQuery({ queryKey:['course', id], queryFn: ()=> apiFetch<Course>(`/api/v1/courses/${id}`)})}
export function useCourseAverage(id:number){ return useQuery({ queryKey:['courseAverage', id], queryFn: ()=> apiFetch<CourseAverage>(`/api/v1/courses/${id}/average`)})}
export function useCreateCourse(){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:any)=> apiFetch<Course>('/api/v1/courses',{method:'POST', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['courses']})})}
export function useUpdateCourse(id:number){ const qc=useQueryClient(); return useMutation({ mutationFn:(b:any)=> apiFetch<Course>(`/api/v1/courses/${id}`,{method:'PATCH', body:JSON.stringify(b)}), onSuccess:()=> qc.invalidateQueries({queryKey:['courses']})})}
