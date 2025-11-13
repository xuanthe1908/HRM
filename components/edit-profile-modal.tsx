"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useLanguage } from "@/contexts/language-context"
import type { Employee } from "@/lib/services"

const editProfileSchema = z.object({
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  phone: z.string().optional(),
  personal_email: z.string().email("Email cá nhân không hợp lệ").optional().or(z.literal('')),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  marital_status: z.string().optional(),
  children_count: z.coerce.number().min(0).optional(),
  ethnicity: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  education_level: z.string().optional(),
  id_number: z.string().optional(),
  id_card_issue_date: z.string().optional(),
  id_card_issue_place: z.string().optional(),
  permanent_address: z.string().optional(),
  current_address: z.string().optional(),
  bank_account: z.string().optional(),
  bank_name: z.string().optional(),
  preferences: z.string().optional(),
})

type EditProfileFormData = z.infer<typeof editProfileSchema>

interface EditProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee
  onSuccess?: () => void
}

export function EditProfileModal({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EditProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  
  const { t } = useLanguage()

  const form = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    // Default values are set in useEffect
  })

  useEffect(() => {
    if (employee) {
      form.reset({
        name: employee.name || "",
        phone: employee.phone || "",
        personal_email: employee.personal_email || "",
        birth_date: employee.birth_date ? employee.birth_date.split('T')[0] : "",
        gender: employee.gender || "",
        marital_status: employee.marital_status || "",
        children_count: employee.children_count || 0,
        ethnicity: employee.ethnicity || "",
        religion: employee.religion || "",
        nationality: employee.nationality || "Việt Nam",
        education_level: employee.education_level || "",
        id_number: employee.id_number || "",
        id_card_issue_date: employee.id_card_issue_date ? employee.id_card_issue_date.split('T')[0] : "",
        id_card_issue_place: employee.id_card_issue_place || "",
        permanent_address: employee.permanent_address || "",
        current_address: employee.current_address || "",
        bank_account: employee.bank_account || "",
        bank_name: employee.bank_name || "",
        preferences: employee.preferences || "",
      })
    }
  }, [employee, open, form])

  const handleProfileUpdate = async (data: EditProfileFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Cập nhật thông tin thất bại')
      }

      toast({
        title: "Thành công",
        description: "Cập nhật thông tin hồ sơ thành công.",
      })
      
      onSuccess?.()
      onOpenChange(false)
      
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi cập nhật thông tin.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError("")
    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.")
      return
    }

    setIsPasswordLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể thay đổi mật khẩu.');
      }

      toast({
        title: "Thành công",
        description: "Mật khẩu của bạn đã được thay đổi.",
      })
      setNewPassword("")
      setConfirmPassword("")
      
    } catch (error: any) {
      setPasswordError(error.message)
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi thay đổi mật khẩu.",
        variant: "destructive",
      })
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hồ sơ cá nhân</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cá nhân của bạn.
          </DialogDescription>
        </DialogHeader>

        {/* Form cập nhật thông tin */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
            <h3 className="text-lg font-medium">Thông tin cá nhân</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="name" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ và tên *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="birth_date" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày sinh</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="gender" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Giới tính</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Nam">Nam</SelectItem>
                      <SelectItem value="Nữ">Nữ</SelectItem>
                      <SelectItem value="Khác">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="marital_status" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Tình trạng hôn nhân</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tình trạng" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Độc thân">Độc thân</SelectItem>
                      <SelectItem value="Đã kết hôn">Đã kết hôn</SelectItem>
                      <SelectItem value="Ly hôn">Ly hôn</SelectItem>
                      <SelectItem value="Góa">Góa</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="children_count" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Số người phụ thuộc</FormLabel>
                  <FormControl><Input type="number" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="ethnicity" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Dân tộc</FormLabel>
                  <FormControl><Input {...field} placeholder="Ví dụ: Kinh, Tày, Thái..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="religion" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Tôn giáo</FormLabel>
                  <FormControl><Input {...field} placeholder="Ví dụ: Không, Phật giáo, Công giáo..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="nationality" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Quốc tịch</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="education_level" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Trình độ học vấn</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trình độ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Tiểu học">Tiểu học</SelectItem>
                      <SelectItem value="Trung học cơ sở">Trung học cơ sở</SelectItem>
                      <SelectItem value="Trung học phổ thông">Trung học phổ thông</SelectItem>
                      <SelectItem value="Trung cấp">Trung cấp</SelectItem>
                      <SelectItem value="Cao đẳng">Cao đẳng</SelectItem>
                      <SelectItem value="Đại học">Đại học</SelectItem>
                      <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                      <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator className="my-4" />

            <h3 className="text-lg font-medium">Thông tin liên lạc</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="phone" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="personal_email" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Email cá nhân</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="id_number" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Số CMND/CCCD</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="id_card_issue_date" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày cấp CMND/CCCD</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="id_card_issue_place" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nơi cấp CMND/CCCD</FormLabel>
                  <FormControl><Input {...field} placeholder="Ví dụ: Công an TP. Hà Nội" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="permanent_address" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Địa chỉ thường trú</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Nhập địa chỉ thường trú đầy đủ" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="current_address" control={form.control} render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Địa chỉ hiện tại</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Nhập địa chỉ hiện tại (nếu khác với địa chỉ thường trú)" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator className="my-4" />

            <h3 className="text-lg font-medium">Thông tin tài chính</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="bank_account" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Số tài khoản ngân hàng</FormLabel>
                  <FormControl><Input {...field} placeholder="Số tài khoản nhận lương" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="bank_name" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên ngân hàng</FormLabel>
                  <FormControl><Input {...field} placeholder="Ví dụ: Vietcombank, BIDV, VCB..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator className="my-4" />

            <h3 className="text-lg font-medium">Ghi chú cá nhân</h3>
            <FormField name="preferences" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Sở thích / Ghi chú</FormLabel>
                <FormControl><Textarea {...field} placeholder="Thông tin bổ sung về sở thích, kỹ năng đặc biệt..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thông tin
            </Button>
          </form>
        </Form>
        
        <Separator className="my-6" />

        {/* Form thay đổi mật khẩu */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Thay đổi mật khẩu</h3>
           <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                disabled={isPasswordLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận lại mật khẩu mới"
                disabled={isPasswordLoading}
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <Button onClick={handleChangePassword} disabled={isPasswordLoading}>
              {isPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đổi mật khẩu
            </Button>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
