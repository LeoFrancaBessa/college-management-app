import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { ItemType } from './types'
export function useItemTypes(){
  return useQuery({ queryKey:['itemTypes'], queryFn: ()=> apiFetch<ItemType[]>('/api/v1/item-types')})
}
