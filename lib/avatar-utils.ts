import { supabase } from './supabase'

/**
 * Chuyển đổi avatar path thành public URL
 * @param avatarPath - Path trong storage, ví dụ: "/avatar/avatar.jpg"
 * @returns Public URL hoặc null
 */
export function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null
  
  try {
    // Loại bỏ "/" đầu nếu có
    const cleanPath = avatarPath.startsWith('/') ? avatarPath.substring(1) : avatarPath
    
    // Tách bucket và file path
    // Ví dụ: "avatar/avatar.jpg" -> bucket: "avatar", filePath: "avatar.jpg"
    const parts = cleanPath.split('/')
    if (parts.length < 2) return null
    
    const bucket = parts[0]
    const filePath = parts.slice(1).join('/')
    
    // Lấy public URL từ Supabase storage
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return data.publicUrl
  } catch (error) {
    console.error('Error getting avatar URL:', error)
    return null
  }
}

/**
 * Upload avatar file và trả về path
 * @param file - File để upload
 * @param employeeId - ID của nhân viên (không dùng cho filename, chỉ để reference)
 * @returns Storage path hoặc throw error
 */
export async function uploadAvatar(file: File, employeeId: string): Promise<string> {
  try {
    // Get current session để lấy auth user ID
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session.session?.user) {
      throw new Error('Not authenticated')
    }
    
    const authUserId = session.session.user.id
    
    // Tạo file name unique dựa trên auth user ID (để match với storage policy)
    const fileExt = file.name.split('.').pop()
    const fileName = `${authUserId}-${Date.now()}.${fileExt}`
    
    // Upload file vào bucket 'avatar'
    const { data, error } = await supabase.storage
      .from('avatar')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true // Cho phép overwrite
      })
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }
    
    // Trả về path với format như database mong đợi: /avatar/filename.ext
    return `/avatar/${fileName}`
  } catch (error) {
    console.error('Error uploading avatar:', error)
    throw error
  }
}

/**
 * Xóa avatar cũ từ storage
 * @param avatarPath - Path của avatar cần xóa
 */
export async function deleteAvatar(avatarPath: string): Promise<void> {
  if (!avatarPath) return
  
  try {
    // Kiểm tra authentication
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session.session?.user) {
      console.warn('Not authenticated, skipping avatar deletion')
      return
    }
    
    const cleanPath = avatarPath.startsWith('/') ? avatarPath.substring(1) : avatarPath
    const parts = cleanPath.split('/')
    
    if (parts.length < 2) return
    
    const bucket = parts[0]
    const filePath = parts.slice(1).join('/')
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])
    
    if (error) {
      console.warn('Error deleting old avatar:', error)
      // Không throw error vì đây là cleanup, không quan trọng lắm
    }
  } catch (error) {
    console.warn('Error deleting avatar:', error)
  }
}
