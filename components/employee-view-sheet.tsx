"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Employee } from "@/lib/services"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface EmployeeViewSheetProps {
  employee: Employee
  formatCurrency: (value: number) => string
  getDepartmentName: (deptId?: string) => string
  getPositionName: (posId?: string) => string
  getManagerName: (managerId?: string) => string
  getStatusLabel: (status: string) => string
}

export function EmployeeViewSheet({
  employee,
  formatCurrency,
  getDepartmentName,
  getPositionName,
  getManagerName,
  getStatusLabel,
}: EmployeeViewSheetProps) {
  const InfoItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-base font-medium">{children}</div>
    </div>
  )
  const [signedFrontUrl, setSignedFrontUrl] = useState<string | null>(null)
  const [signedBackUrl, setSignedBackUrl] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const loadSignedUrls = async () => {
      const paths: string[] = []
      if (employee.id_card_front_url) paths.push(employee.id_card_front_url)
      if (employee.id_card_back_url) paths.push(employee.id_card_back_url)
      if (paths.length === 0) return

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) return

      const res = await fetch("/api/storage/sign-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ paths, expiresIn: 600 }),
      })

      if (!res.ok) return
      const json = await res.json()
      const results: Array<{ path: string; signedUrl: string | null }> = json.results || []

      if (isCancelled) return
      const front = results.find(r => r.path === employee.id_card_front_url)?.signedUrl || null
      const back = results.find(r => r.path === employee.id_card_back_url)?.signedUrl || null
      setSignedFrontUrl(front)
      setSignedBackUrl(back)
    }

    loadSignedUrls()
    return () => { isCancelled = true }
  }, [employee.id_card_front_url, employee.id_card_back_url])
  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      admin: 'Quản trị viên',
      hr: 'Nhân sự',
      lead: 'Trưởng nhóm',
      accountant: 'Kế toán',
      employee: 'Nhân viên',
    }
    return map[role] || role
  }
  return (
    <div className="py-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Họ tên">{employee.name}</InfoItem>
            <InfoItem label="Email công ty">{employee.email}</InfoItem>
            <InfoItem label="Email cá nhân">{employee.personal_email || 'N/A'}</InfoItem>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoItem label="SĐT">{employee.phone || 'N/A'}</InfoItem>
            <InfoItem label="Giới tính">{employee.gender || 'N/A'}</InfoItem>
            <InfoItem label="Ngày sinh">{employee.birth_date || 'N/A'}</InfoItem>
            <InfoItem label="Hôn nhân">{employee.marital_status || 'N/A'}</InfoItem>
            <InfoItem label="Số phụ thuộc">{employee.children_count ?? 'N/A'}</InfoItem>
            <InfoItem label="Dân tộc">{employee.ethnicity || 'N/A'}</InfoItem>
            <InfoItem label="Tôn giáo">{employee.religion || 'N/A'}</InfoItem>
            <InfoItem label="Quốc tịch">{employee.nationality || 'N/A'}</InfoItem>
            <InfoItem label="Trình độ học vấn">{employee.education_level || 'N/A'}</InfoItem>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin công việc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InfoItem label="Mã nhân viên">{employee.employee_code}</InfoItem>
            <InfoItem label="Phòng ban">{getDepartmentName(employee.department_id)}</InfoItem>
            <InfoItem label="Chức vụ">{getPositionName(employee.position_id)}</InfoItem>
            <InfoItem label="Quản lý trực tiếp">{getManagerName(employee.manager_id)}</InfoItem>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InfoItem label="Ngày vào làm">{employee.start_date || 'N/A'}</InfoItem>
            <InfoItem label="Ngày chính thức">{employee.official_start_date || 'N/A'}</InfoItem>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground">Trạng thái</div>
              <div className="text-sm font-medium">
                <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                  {getStatusLabel(employee.status)}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground">Vai trò hệ thống</div>
              <div className="text-sm font-medium">
                <Badge variant="outline">{getRoleLabel(employee.role)}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin định danh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoItem label="Số CCCD/CMND">{employee.id_number || 'N/A'}</InfoItem>
            <InfoItem label="Ngày cấp CCCD">{employee.id_card_issue_date || 'N/A'}</InfoItem>
            <InfoItem label="Nơi cấp CCCD">{employee.id_card_issue_place || 'N/A'}</InfoItem>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoItem label="Số BHXH">{employee.social_insurance_number || 'N/A'}</InfoItem>
            <InfoItem label="Mã số thuế">{employee.tax_code || 'N/A'}</InfoItem>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-xs text-muted-foreground">Ảnh mặt trước CCCD</div>
              {employee.id_card_front_url ? (
                signedFrontUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(signedFrontUrl as string, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-2 w-max"
                  >
                    <Eye className="h-4 w-4" />
                    Xem ảnh
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled className="inline-flex items-center gap-2 w-max">
                    <Eye className="h-4 w-4" />
                    Đang tạo liên kết...
                  </Button>
                )
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs text-muted-foreground">Ảnh mặt sau CCCD</div>
              {employee.id_card_back_url ? (
                signedBackUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(signedBackUrl as string, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-2 w-max"
                  >
                    <Eye className="h-4 w-4" />
                    Xem ảnh
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled className="inline-flex items-center gap-2 w-max">
                    <Eye className="h-4 w-4" />
                    Đang tạo liên kết...
                  </Button>
                )
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Địa chỉ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <InfoItem label="Địa chỉ thường trú">{employee.permanent_address || 'N/A'}</InfoItem>
            <InfoItem label="Địa chỉ tạm trú">{employee.current_address || 'N/A'}</InfoItem>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tài khoản ngân hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Số tài khoản">{employee.bank_account || 'N/A'}</InfoItem>
            <InfoItem label="Ngân hàng">{employee.bank_name || 'N/A'}</InfoItem>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lương cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Lương cơ bản">{formatCurrency(employee.base_salary)}</InfoItem>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


