"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, CheckCircle, XCircle } from "lucide-react"

export default function InitDataPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const initData = async () => {
    try {
      setIsLoading(true)
      setResults(null)

      const response = await fetch('/api/settings/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        setResults(data)
        toast({
          title: "Thành công",
          description: data.message,
          variant: "default",
        })
      } else {
        toast({
          title: "Lỗi",
          description: data.error || "Đã có lỗi xảy ra",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Lỗi",
        description: "Đã có lỗi xảy ra khi khởi tạo dữ liệu",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Khởi tạo dữ liệu</h1>
          <p className="text-muted-foreground">
            Thêm phòng ban và chức vụ mới vào hệ thống
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Khởi tạo dữ liệu mẫu
          </CardTitle>
          <CardDescription>
            Thêm phòng ban "Headhunter", "BD" và chức vụ "Chuyên Viên", "Intern"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={initData} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang khởi tạo...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Khởi tạo dữ liệu
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Phòng ban */}
          <Card>
            <CardHeader>
              <CardTitle>Phòng ban đã thêm</CardTitle>
              <CardDescription>
                {results.departments.added.length} phòng ban mới
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.departments.added.map((dept: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    {dept.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={dept.success ? "text-green-700" : "text-red-700"}>
                      {dept.name}
                    </span>
                    {!dept.success && (
                      <span className="text-xs text-red-500">({dept.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chức vụ */}
          <Card>
            <CardHeader>
              <CardTitle>Chức vụ đã thêm</CardTitle>
              <CardDescription>
                {results.positions.added.length} chức vụ mới
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.positions.added.map((pos: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    {pos.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={pos.success ? "text-green-700" : "text-red-700"}>
                      {pos.name}
                    </span>
                    {!pos.success && (
                      <span className="text-xs text-red-500">({pos.error})</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {results && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Danh sách phòng ban */}
          <Card>
            <CardHeader>
              <CardTitle>Tất cả phòng ban</CardTitle>
              <CardDescription>
                {results.departments.all.length} phòng ban trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.departments.all.map((dept: any) => (
                  <div key={dept.id} className="flex justify-between items-center">
                    <span>{dept.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {dept.description}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Danh sách chức vụ */}
          <Card>
            <CardHeader>
              <CardTitle>Tất cả chức vụ</CardTitle>
              <CardDescription>
                {results.positions.all.length} chức vụ trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.positions.all.map((pos: any) => (
                  <div key={pos.id} className="flex justify-between items-center">
                    <span>{pos.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {pos.description}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 