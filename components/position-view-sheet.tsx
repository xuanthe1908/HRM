"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Position, Department } from "@/lib/services"
import { Briefcase, Calendar, FileText, Building } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface PositionViewSheetProps {
  position: Position
  getDepartmentName: (deptId?: string) => string
}

export function PositionViewSheet({ position, getDepartmentName }: PositionViewSheetProps) {
  const InfoItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-base font-medium">{children}</div>
    </div>
  )

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="py-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label="Tên chức vụ">{position.name}</InfoItem>
            <InfoItem label="Phòng ban">{getDepartmentName(position.department_id)}</InfoItem>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label="Mô tả">{position.description || 'N/A'}</InfoItem>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label="Ngày khởi tạo">{formatDate(position.created_at)}</InfoItem>
            <InfoItem label="Cập nhật gần nhất">{formatDate(position.updated_at)}</InfoItem>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
