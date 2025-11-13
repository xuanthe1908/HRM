"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2, Briefcase, FileText, Building } from "lucide-react"
import type { Position, Department } from "@/lib/services"

// Schema validation for position form
const positionFormSchema = z.object({
  name: z.string()
    .min(2, "Tên chức vụ phải có ít nhất 2 ký tự")
    .max(100, "Tên chức vụ không được vượt quá 100 ký tự"),
  department_id: z.string().min(1, "Phòng ban là bắt buộc"),
  description: z.string()
    .max(500, "Mô tả không được vượt quá 500 ký tự")
    .optional(),
});

export type PositionFormData = z.infer<typeof positionFormSchema>

interface PositionFormProps {
  departments: Department[]
  onSubmit: (data: PositionFormData) => Promise<void>
  onCancel: () => void
  initialData?: Position
  isSubmitting?: boolean
  error?: string
}

export function PositionForm({ 
  departments,
  onSubmit, 
  onCancel, 
  initialData, 
  isSubmitting = false,
  error
}: PositionFormProps) {
  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      department_id: initialData?.department_id || "",
      description: initialData?.description || "",
    },
  })

  const handleSubmit = async (data: PositionFormData) => {
    await onSubmit(data)
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên chức vụ *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nhập tên chức vụ" 
                          maxLength={100}
                          {...field} 
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <FormMessage />
                        <span>{field.value?.length || 0}/100 ký tự</span>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phòng ban *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn phòng ban" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Nhập mô tả chức vụ (tùy chọn)" 
                        className="resize-none"
                        rows={3}
                        maxLength={500}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <FormMessage />
                      <span>{field.value?.length || 0}/500 ký tự</span>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Error Message Display */}
          {error && (
            <div className="rounded-md bg-destructive/15 p-4 border border-destructive/20">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">
                    Lỗi
                  </h3>
                  <div className="mt-2 text-sm text-destructive">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Cập nhật' : 'Thêm chức vụ'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
