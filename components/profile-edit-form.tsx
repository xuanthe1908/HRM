"use client"

import { useState, useEffect } from "react"
import { useForm, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Loader2, Upload, User, FileText, Banknote, Building, Calendar, AlertCircle, X } from "lucide-react"
import { DocumentUpload } from '@/components/document-upload'
import { useAuth } from "@/contexts/auth-context"
import { employeeService } from "@/lib/services"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VIETNAMESE_ETHNICITIES, VIETNAMESE_BANKS, COUNTRIES } from "@/data/vietnam"

// Schema validation for profile completion
const profileCompletionSchema = z.object({
  // Basic Information
  name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(10, "Số điện thoại phải có ít nhất 10 số"),
  personal_email: z.string().email("Email cá nhân không hợp lệ").optional().or(z.literal('')),
  
  // Personal Information
  gender: z.string().min(1, "Vui lòng chọn giới tính"),
  birth_date: z.string().min(1, "Ngày sinh là bắt buộc"),
  marital_status: z.string().min(1, "Tình trạng hôn nhân là bắt buộc"),
  children_count: z.coerce.number().min(0).optional(),
  ethnicity: z.string().min(1, "Dân tộc là bắt buộc"),
  religion: z.string().min(1, "Tôn giáo là bắt buộc"),
  nationality: z.string().min(1, "Quốc tịch là bắt buộc"),
  education_level: z.string().min(1, "Trình độ học vấn là bắt buộc"),
  
  // Identity Information
  id_number: z.string().min(9, "Số CCCD/CMND phải có ít nhất 9 số"),
  social_insurance_number: z.string().optional().or(z.literal('')),
  tax_code: z.string().optional().or(z.literal('')),
  id_card_issue_date: z.string().min(1, "Ngày cấp CCCD là bắt buộc"),
  id_card_issue_place: z.string().min(1, "Nơi cấp CCCD là bắt buộc"),
  
  // Address Information
  permanent_address: z.string().min(1, "Địa chỉ thường trú là bắt buộc"),
  current_address: z.string().min(1, "Địa chỉ tạm trú là bắt buộc"),
  
  // Bank Information
  bank_account: z.string().min(1, "Số tài khoản là bắt buộc"),
  bank_name: z.string().min(1, "Tên ngân hàng là bắt buộc"),
  
  // Document uploads
  id_card_front_url: z.string().optional(),
  id_card_back_url: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileCompletionSchema>

interface ProfileEditFormProps {
  employee: any
  onSuccess: () => void
  onCancel: () => void
  isForced?: boolean // If true, this is for profile completion (new employee)
}

export function ProfileEditForm({ employee, onSuccess, onCancel, isForced = false }: ProfileEditFormProps) {
  const { refreshUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)

  // Load documents for the employee (similar to EmployeeForm)
  const loadDocuments = async () => {
    if (!employee?.id) return;
    
    setIsLoadingDocuments(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}/documents`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, [employee?.id]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      name: employee?.name || '',
      phone: employee?.phone || '',
      personal_email: employee?.personal_email || '',
      gender: employee?.gender || '',
      birth_date: employee?.birth_date || '',
      marital_status: employee?.marital_status || '',
      children_count: employee?.children_count || 0,
      ethnicity: employee?.ethnicity || '',
      religion: employee?.religion || '',
      nationality: employee?.nationality || 'Việt Nam',
      education_level: employee?.education_level || '',
      id_number: employee?.id_number || '',
      social_insurance_number: employee?.social_insurance_number || '',
      tax_code: employee?.tax_code || '',
      id_card_issue_date: employee?.id_card_issue_date || '',
      id_card_issue_place: employee?.id_card_issue_place || '',
      permanent_address: employee?.permanent_address || '',
      current_address: employee?.current_address || '',
      bank_account: employee?.bank_account || '',
      bank_name: employee?.bank_name || '',
      id_card_front_url: '',
      id_card_back_url: '',
    },
  })


  const onSubmit = async (data: ProfileFormData) => {
    console.log('Form submission - Documents state:', documents)
    console.log('Form submission - Front image uploaded:', frontImageUploaded)
    console.log('Form submission - Back image uploaded:', backImageUploaded)
    
    // Check if required ID card images are uploaded before submission
    if (!frontImageUploaded || !backImageUploaded) {
      console.log('Pre-submission validation failed - missing documents')
      toast({
        variant: "destructive",
        title: "Thiếu tài liệu bắt buộc",
        description: "Vui lòng tải lên đầy đủ ảnh mặt trước và mặt sau CCCD trước khi gửi.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Remove ID card URLs from update data since they're handled by DocumentUpload component
      const { id_card_front_url, id_card_back_url, ...updateData } = data

      const response = await employeeService.updateEmployee(employee.id, updateData)
      
      if (response.data) {
        toast({
          title: "Thành công",
          description: isForced ? "Hồ sơ đã được hoàn thiện!" : "Thông tin hồ sơ đã được cập nhật!",
        })
        await refreshUser()
        onSuccess()
      } else {
        // Show detailed server error response
        const errorMessage = response.error || 'Có lỗi xảy ra'
        const errorDetails = response.message ? `\n\nChi tiết: ${response.message}` : ''
        const statusCode = response.status ? `\n\nMã lỗi: ${response.status}` : ''
        
        toast({
          variant: "destructive",
          title: "Lỗi cập nhật hồ sơ",
          description: `${errorMessage}${errorDetails}${statusCode}`,
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      
      // Handle different types of errors
      let errorTitle = "Lỗi"
      let errorDescription = "Có lỗi xảy ra khi cập nhật hồ sơ"
      
      if (error instanceof Error) {
        errorDescription = error.message
        
        // Check if it's a network error
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorTitle = "Lỗi kết nối"
          errorDescription = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet và thử lại."
        }
        // Check if it's a validation error
        else if (error.message.includes('validation') || error.message.includes('required')) {
          errorTitle = "Lỗi xác thực dữ liệu"
        }
        // Check if it's a server error
        else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          errorTitle = "Lỗi máy chủ"
          errorDescription = "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
        }
      }
      
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorDescription,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onError = (errors: FieldErrors<ProfileFormData>) => {
    console.error('Form validation errors:', errors)
    console.log('Documents state:', documents)
    console.log('Front image uploaded:', frontImageUploaded)
    console.log('Back image uploaded:', backImageUploaded)
    
    // Get the first error message for display
    const firstError = Object.values(errors)[0]
    const errorMessage = firstError?.message || "Vui lòng kiểm tra lại thông tin đã nhập"
    
    // Count total errors
    const errorCount = Object.keys(errors).length
    const errorCountText = errorCount > 1 ? ` (${errorCount} lỗi)` : ""
    
    toast({
      variant: "destructive",
      title: `Lỗi xác thực${errorCountText}`,
      description: errorMessage,
    })
  }

  // Check if both ID card images are uploaded by checking if they exist in the documents array
  const frontImageUploaded = !!documents.find(doc => doc.type === 'id_card_front')
  const backImageUploaded = !!documents.find(doc => doc.type === 'id_card_back')
  const isFormValid = form.formState.isValid && frontImageUploaded && backImageUploaded

  return (
    <div className="space-y-6">
      {isForced && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Bạn cần hoàn thiện hồ sơ cá nhân để có thể sử dụng đầy đủ các tính năng của hệ thống.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} noValidate className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Thông tin cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ và tên *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số điện thoại *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personal_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email cá nhân</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giới tính *</FormLabel>
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
                  )}
                />
                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày sinh *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="marital_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tình trạng hôn nhân *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tình trạng hôn nhân" />
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
                  )}
                />
                <FormField
                  control={form.control}
                  name="children_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số người phụ thuộc</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ethnicity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dân tộc *</FormLabel>
                      <Autocomplete
                        value={field.value}
                        onChange={field.onChange}
                        placeholder=""
                        options={VIETNAMESE_ETHNICITIES.map(e => ({ label: e, value: e }))}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tôn giáo *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quốc tịch *</FormLabel>
                      <Autocomplete
                        value={field.value}
                        onChange={field.onChange}
                        placeholder=""
                        options={COUNTRIES.map(c => ({ label: c, value: c }))}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="education_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trình độ học vấn *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trình độ học vấn" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Trung học phổ thông">Trung học phổ thông</SelectItem>
                          <SelectItem value="Cao đẳng">Cao đẳng</SelectItem>
                          <SelectItem value="Đại học">Đại học</SelectItem>
                          <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                          <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Identity Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Thông tin định danh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tax_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã số thuế</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_insurance_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số BHXH</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="id_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số CCCD/CMND *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="id_card_issue_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày cấp CCCD *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="id_card_issue_place"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nơi cấp CCCD *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                

              </div>

              <Separator />

              <div className="space-y-4">
                {isLoadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      <p>Đang tải tài liệu...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ảnh mặt trước CCCD *</Label>
                      <DocumentUpload
                        employeeId={employee.id}
                        documentType="id_card_front"
                        documentName="Ảnh mặt trước CCCD"
                        existingDocument={documents.find(doc => doc.type === 'id_card_front')}
                        onUploadSuccess={loadDocuments}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ảnh mặt sau CCCD *</Label>
                      <DocumentUpload
                        employeeId={employee.id}
                        documentType="id_card_back"
                        documentName="Ảnh mặt sau CCCD"
                        existingDocument={documents.find(doc => doc.type === 'id_card_back')}
                        onUploadSuccess={loadDocuments}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Thông tin địa chỉ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="permanent_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Địa chỉ thường trú *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="current_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Địa chỉ tạm trú *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bank Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Thông tin ngân hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bank_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tài khoản *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên ngân hàng *</FormLabel>
                      <Autocomplete
                        value={field.value}
                        onChange={field.onChange}
                        placeholder=""
                        options={VIETNAMESE_BANKS.map(b => ({ label: b, value: b }))}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                {isForced ? 'Hủy' : 'Đóng'}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isForced ? 'Hoàn thành hồ sơ' : 'Cập nhật hồ sơ'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
