"use client"

import { useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, File as FileIcon, X } from "lucide-react"

interface ExpenseAttachmentUploadProps {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  accept?: string
  maxSizeBytes?: number
}

export function ExpenseAttachmentUpload({
  files,
  onChange,
  disabled = false,
  accept = ".png,.jpg,.jpeg,.pdf",
  maxSizeBytes = 10 * 1024 * 1024,
}: ExpenseAttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleSelect = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      const selected = Array.from(fileList)
      const valid = selected.filter((f) => f.size <= maxSizeBytes)
      onChange([...(files || []), ...valid])
    },
    [files, maxSizeBytes, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (disabled) return
      handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles]
  )

  const handleRemove = useCallback(
    (index: number) => {
      const next = [...files]
      next.splice(index, 1)
      onChange(next)
    },
    [files, onChange]
  )

  return (
    <div className="space-y-2">
      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Kéo thả file hoặc click để chọn</p>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF (tối đa 10MB)</p>
        <div className="mt-3">
          <Button size="sm" variant="secondary" disabled={disabled} onClick={handleSelect}>
            <Upload className="h-4 w-4 mr-2" /> Chọn tệp
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files && files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, idx) => (
            <div key={`${f.name}-${idx}`} className="flex items-center justify-between rounded border p-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate max-w-[220px]" title={f.name}>{f.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {(f.size / 1024).toFixed(0)} KB
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600"
                onClick={() => handleRemove(idx)}
                disabled={disabled}
                title="Xóa"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


