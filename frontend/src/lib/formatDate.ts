export function fmtDate(iso?: string | null) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR') }
export function fmtDateTime(iso?: string | null) { if (!iso) return '—'; return new Date(iso).toLocaleString('pt-BR') }
