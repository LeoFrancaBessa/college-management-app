import { useState } from 'react'
import { useAttachments, useUploadAttachment, useDeleteAttachment, getAttachmentDownloadUrl } from '../../api/attachments'
import { ApiError } from '../../api/client'
import { Button } from '../ui/Button'

const MAX_SIZE = 20 * 1024 * 1024

export function AttachmentList({ itemId }: { itemId: number }) {
  const { data: attachments, isLoading } = useAttachments(itemId)
  const upload = useUploadAttachment(itemId)
  const delAttachment = useDeleteAttachment()
  const [uploadError, setUploadError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    if (file.size > MAX_SIZE) {
      setUploadError('Arquivo muito grande (max 20MB)')
      e.target.value = ''
      return
    }
    try {
      await upload.mutateAsync(file)
    } catch (err: any) {
      if (err instanceof ApiError) setUploadError(err.detail)
      else setUploadError(err?.detail ?? err?.message ?? 'Erro ao enviar anexo')
    } finally {
      e.target.value = ''
    }
  }

  const handleDelete = async (id: number) => {
    setDeleteError('')
    try {
      await delAttachment.mutateAsync(id)
    } catch (err: any) {
      if (err instanceof ApiError) setDeleteError(err.detail)
      else setDeleteError(err?.detail ?? err?.message ?? 'Erro ao remover anexo')
    }
  }

  const handleDownload = async (id: number, filename: string) => {
    try {
      const res = await fetch(`${getAttachmentDownloadUrl(id)}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setDeleteError('Erro ao baixar anexo')
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700">Enviar arquivo (max 20MB)</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        {upload.isPending && <p className="text-xs text-gray-500 mt-1">Enviando...</p>}
        {uploadError && <p className="text-sm text-red-600 mt-1">{uploadError}</p>}
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500">Carregando anexos...</p>
      ) : !attachments?.length ? (
        <p className="text-sm text-gray-500">Nenhum anexo.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((att: any) => (
            <li key={att.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{att.original_filename}</p>
                <p className="text-xs text-gray-500">
                  {(att.size / 1024).toFixed(1)} KB · {att.content_type}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" onClick={() => handleDownload(att.id, att.original_filename)}>
                  Baixar
                </Button>
                <button
                  onClick={() => handleDelete(att.id)}
                  disabled={delAttachment.isPending}
                  className="min-h-[44px] px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
    </div>
  )
}
