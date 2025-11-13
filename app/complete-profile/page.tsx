"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Loader2, Upload, User, FileText, Banknote, Building, Calendar, AlertCircle } from "lucide-react"
import { DocumentUpload } from '@/components/document-upload'
import { useAuth } from "@/contexts/auth-context"
import { employeeService } from "@/lib/services"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthGuard } from "@/components/auth-guard"
import { isProfileComplete } from "@/lib/profile-completion-check"

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
  permanent_address: z.string().min(10, "Địa chỉ thường trú phải có ít nhất 10 ký tự"),
  current_address: z.string().min(10, "Địa chỉ tạm trú phải có ít nhất 10 ký tự"),
  
  // Bank Information
  bank_account: z.string().min(10, "Số tài khoản phải có ít nhất 10 số"),
  bank_name: z.string().min(1, "Tên ngân hàng là bắt buộc"),
})

export type ProfileCompletionData = z.infer<typeof profileCompletionSchema>

export default function CompleteProfilePage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'personal' | 'identity'>('basic')
  const tabOrder: Array<'basic' | 'personal' | 'identity'> = ['basic', 'personal', 'identity']
  const goNext = () => {
    const idx = tabOrder.indexOf(activeTab)
    if (idx < tabOrder.length - 1) setActiveTab(tabOrder[idx + 1])
  }
  const goBack = () => {
    const idx = tabOrder.indexOf(activeTab)
    if (idx > 0) setActiveTab(tabOrder[idx - 1])
  }

  // Map fields to tabs for error-driven navigation on submit
  const fieldToTab: Record<string, 'basic' | 'personal' | 'identity'> = {
    // basic
    name: 'basic',
    phone: 'basic',
    personal_email: 'basic',
    // personal
    gender: 'personal',
    birth_date: 'personal',
    marital_status: 'personal',
    children_count: 'personal',
    ethnicity: 'personal',
    religion: 'personal',
    nationality: 'personal',
    education_level: 'personal',
    permanent_address: 'personal',
    current_address: 'personal',
    bank_account: 'personal',
    bank_name: 'personal',
    // identity
    social_insurance_number: 'identity',
    tax_code: 'identity',
    id_number: 'identity',
    id_card_issue_date: 'identity',
    id_card_issue_place: 'identity',
  }
  const onError = (errors: FieldErrors<ProfileCompletionData>) => {
    const errorFields = Object.keys(errors)
    for (const field of errorFields) {
      const tab = fieldToTab[field]
      if (tab) {
        setActiveTab(tab)
        break
      }
    }
  }

  const form = useForm<ProfileCompletionData>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      personal_email: user?.personal_email || "",
      gender: user?.gender || "",
      birth_date: user?.birth_date || "",
      marital_status: user?.marital_status || "",
      children_count: user?.children_count || 0,
      ethnicity: user?.ethnicity || "",
      religion: user?.religion || "",
      nationality: user?.nationality || "Việt Nam",
      education_level: user?.education_level || "",
      id_number: user?.id_number || "",
      social_insurance_number: user?.social_insurance_number || "",
      tax_code: user?.tax_code || "",
      id_card_issue_date: user?.id_card_issue_date || "",
      id_card_issue_place: user?.id_card_issue_place || "",
      permanent_address: user?.permanent_address || "",
      current_address: user?.current_address || "",
      bank_account: user?.bank_account || "",
      bank_name: user?.bank_name || "",
    },
  })

  // Check if profile is already complete
  useEffect(() => {
    if (user && isProfileComplete(user)) {
      router.push("/employee/profile")
    }
  }, [user, router])

  const onSubmit = async (values: ProfileCompletionData) => {
    if (!user) return

    // Check if ID cards are uploaded
    if (!user.id_card_front_url || !user.id_card_back_url) {
      toast({
        variant: "destructive",
        title: "Thiếu tài liệu",
        description: "Vui lòng tải lên ảnh mặt trước và mặt sau của CCCD/CMND",
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await employeeService.updateEmployee(user.id, values)
      
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Cập nhật thất bại",
          description: result.error,
        })
      } else {
        toast({
          title: "Hoàn thành hồ sơ thành công",
          description: "Hồ sơ của bạn đã được cập nhật đầy đủ.",
        })
        await refreshUser()
        router.push("/employee/profile")
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Đang tải thông tin...</span>
        </div>
      </div>
    )
  }

  return (
    <AuthGuard requireProfileCompletion={false}>
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Chào mừng bạn đến với hệ thống!</strong> Để sử dụng đầy đủ các tính năng, 
              vui lòng hoàn thiện thông tin hồ sơ cá nhân của bạn.
            </AlertDescription>
          </Alert>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Hoàn thiện hồ sơ cá nhân</CardTitle>
            <p className="text-muted-foreground">
              Vui lòng điền đầy đủ thông tin bên dưới để hoàn tất quá trình đăng ký
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, onError)} noValidate className="space-y-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Thông tin cơ bản</TabsTrigger>
                    <TabsTrigger value="personal">Thông tin cá nhân</TabsTrigger>
                    <TabsTrigger value="identity">Thông tin định danh</TabsTrigger>
                  </TabsList>

                  {/* Basic Information Tab */}
                  <TabsContent value="basic" className="space-y-6">
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
                                  <Input {...field} placeholder="0123456789" />
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
                                  <Input {...field} type="email" placeholder="email@example.com" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Personal Information Tab */}
                  <TabsContent value="personal" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Thông tin cá nhân
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  <Input {...field} type="date" />
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
                                <FormLabel>Người phụ thuộc</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min="0" />
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
                                <FormControl>
                                  <Input {...field} placeholder="Kinh" />
                                </FormControl>
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
                                  <Input {...field} placeholder="Không" />
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
                                <FormControl>
                                  <Input {...field} placeholder="Việt Nam" />
                                </FormControl>
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
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Thông tin địa chỉ
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="permanent_address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Địa chỉ thường trú *</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" />
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
                                <Textarea {...field} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

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
                                  <Input {...field} placeholder="0123456789" />
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
                                <FormControl>
                                  <Input {...field} placeholder="Vietcombank" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Identity Information Tab */}
                  <TabsContent value="identity" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Thông tin định danh
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Order: Số BHXH, Mã số thuế, Số CCCD/CMND, Ngày cấp CCCD */}
                          <FormField
                            control={form.control}
                            name="social_insurance_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Số BHXH</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="1234567890" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="tax_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mã số thuế</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="0123456789" />
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
                                  <Input {...field} placeholder="123456789" />
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
                                  <Input {...field} type="date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="id_card_issue_place"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Nơi cấp CCCD *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Công an tỉnh/TP..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Documents moved into Identity section - stacked vertically */}
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label>Ảnh mặt trước CCCD/CMND *</Label>
                            <DocumentUpload
                              employeeId={user.id}
                              documentType="id_card_front"
                              documentName="Ảnh mặt trước CCCD/CMND"
                              existingDocument={user.id_card_front_url ? {
                                type: "id_card_front",
                                name: "Ảnh mặt trước CCCD/CMND",
                                url: user.id_card_front_url,
                                path: user.id_card_front_url
                              } : undefined}
                              onUploadSuccess={() => {
                                // Refresh user data to get updated URLs
                                refreshUser()
                              }}
                            />
                            {!user.id_card_front_url && (
                              <p className="text-sm text-destructive">Bắt buộc tải lên ảnh mặt trước CCCD/CMND.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Ảnh mặt sau CCCD/CMND *</Label>
                            <DocumentUpload
                              employeeId={user.id}
                              documentType="id_card_back"
                              documentName="Ảnh mặt sau CCCD/CMND"
                              existingDocument={user.id_card_back_url ? {
                                type: "id_card_back",
                                name: "Ảnh mặt sau CCCD/CMND",
                                url: user.id_card_back_url,
                                path: user.id_card_back_url
                              } : undefined}
                              onUploadSuccess={() => {
                                // Refresh user data to get updated URLs
                                refreshUser()
                              }}
                            />
                            {!user.id_card_back_url && (
                              <p className="text-sm text-destructive">Bắt buộc tải lên ảnh mặt sau CCCD/CMND.</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {activeTab !== 'identity' ? (
                  <div className="flex justify-between pt-6">
                    {activeTab !== 'basic' ? (
                      <Button type="button" variant="outline" onClick={goBack}>
                        ← Quay lại
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button type="button" onClick={goNext}>
                      Tiếp tục →
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between pt-6">
                    <Button type="button" variant="outline" onClick={goBack}>
                      ← Quay lại
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-w-[200px]"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSubmitting ? "Đang xử lý..." : "Hoàn thành hồ sơ"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
    </AuthGuard>
  )
}
