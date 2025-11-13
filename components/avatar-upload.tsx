"use client"

import { useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Camera, Loader2, X, Upload } from 'lucide-react'
import { getAvatarUrl, uploadAvatar, deleteAvatar } from '@/lib/avatar-utils'
import { useToast } from '@/components/ui/use-toast'

interface AvatarUploadProps {
  currentAvatarPath?: string | null
  employeeId: string
  employeeName: string
  onAvatarChange?: (newAvatarPath: string | null) => void
  onFileSelected?: (path: string | null) => void
  disabled?: boolean
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  deferredUpload?: boolean
  hideActions?: boolean
}

export function AvatarUpload({
  currentAvatarPath,
  employeeId,
  employeeName,
  onAvatarChange,
  onFileSelected,
  disabled = false,
  showLabel = true,
  size = 'lg',
  deferredUpload = false,
  hideActions = false
}: AvatarUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  // Xác định kích thước avatar
  const avatarSizes = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20', 
    lg: 'w-24 h-24'
  }
  
  const avatarSize = avatarSizes[size]
  
  // Lấy URL hiện tại
  const currentAvatarUrl = getAvatarUrl(currentAvatarPath)
  const displayUrl = previewUrl || currentAvatarUrl
  
  // Lấy initials từ tên
  const initials = employeeName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file ảnh (jpg, png, gif, etc.)',
        variant: 'destructive'
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Lỗi', 
        description: 'Kích thước file phải nhỏ hơn 5MB',
        variant: 'destructive'
      })
      return
    }

    try {
      setUploading(true)
      
      // Tạo preview URL
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      let newAvatarPath: string | null = null
      // Upload file to storage (always upload to storage to get a path)
      newAvatarPath = await uploadAvatar(file, employeeId)

      if (deferredUpload) {
        // Defer DB update to parent on save
        onFileSelected?.(newAvatarPath)
        return
      }

      // Immediate mode: also update DB
      
      // Cleanup preview URL
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
      
      // Update database thông qua API
      const response = await fetch(`/api/employees/${employeeId}/avatar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ avatar_url: newAvatarPath })
      })

      if (!response.ok) {
        throw new Error('Failed to update avatar in database')
      }

      // Xóa avatar cũ nếu có
      if (currentAvatarPath) {
        await deleteAvatar(currentAvatarPath)
      }

      toast({
        title: 'Thành công',
        description: 'Cập nhật avatar thành công!'
      })

      // Callback để parent component cập nhật
      onAvatarChange?.(newAvatarPath)
      onFileSelected?.(null)
      
    } catch (error) {
      console.error('Error uploading avatar:', error)
      
      // Cleanup preview URL on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      
      toast({
        title: 'Lỗi',
        description: 'Không thể upload avatar. Vui lòng thử lại.',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!currentAvatarPath) return
    
    try {
      setUploading(true)
      if (deferredUpload) {
        // In deferred mode, simply clear selection and signal removal
        setPreviewUrl(null)
        onFileSelected?.('__REMOVE__')
        onAvatarChange?.(null)
        return
      }
      
      // Update database để xóa avatar_url
      const response = await fetch(`/api/employees/${employeeId}/avatar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ avatar_url: null })
      })

      if (!response.ok) {
        throw new Error('Failed to remove avatar from database')
      }

      // Xóa file từ storage
      await deleteAvatar(currentAvatarPath)

      toast({
        title: 'Thành công',
        description: 'Đã xóa avatar'
      })

      onAvatarChange?.(null)
      
    } catch (error) {
      console.error('Error removing avatar:', error)
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa avatar. Vui lòng thử lại.',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {showLabel && (
        <Label className="text-sm font-medium">Avatar</Label>
      )}
      
      <div className="relative group">
        <Avatar className={`${avatarSize} transition-all group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-2`}>
          <AvatarImage 
            src={displayUrl || undefined} 
            alt={`Avatar của ${employeeName}`}
          />
          <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Loading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
        
        {/* Upload button overlay */}
        {!uploading && !disabled && !hideActions && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-full flex items-center justify-center transition-all">
            <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!hideActions && (
      <div className="flex flex-col items-center space-y-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
          disabled={disabled || uploading}
        />
        
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Đang tải...' : 'Chọn ảnh'}
          </Button>
          
          {currentAvatarPath && !uploading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveAvatar}
              disabled={disabled}
            >
              <X className="h-4 w-4 mr-2" />
              Xóa
            </Button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          <p>Chọn ảnh JPG, PNG hoặc GIF</p>
          <p>Tối đa 5MB</p>
        </div>
      </div>
      )}
      
    </div>
  )
}
