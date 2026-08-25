export function nextOffset(offset: number, limit: number, returned: number) { return returned < limit ? null : offset + limit }
