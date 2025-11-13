'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, Calendar } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    employee_code: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    employee_code: string;
    message: string;
  }>;
  month?: number;
  year?: number;
}

interface AttendanceMonthlyImportProps {
  onImportSuccess?: () => void;
}

export function AttendanceMonthlyImport({ onImportSuccess }: AttendanceMonthlyImportProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const fileName = droppedFile.name.toLowerCase();
      const isCSV = fileName.endsWith('.csv');
      
      if (isCSV) {
        setFile(droppedFile);
        setResult(null);
      } else {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn file CSV",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileName = selectedFile.name.toLowerCase();
      const isCSV = fileName.endsWith('.csv');
      
      if (isCSV) {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn file CSV",
          variant: "destructive"
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', 'monthly'); // Indicate this is monthly format

      const response = await fetch('/api/attendance/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi upload file');
      }

      setResult(data);
      
      if (data.success > 0) {
        toast({
          title: "Thành công",
          description: `Đã import ${data.success} bản ghi chấm công cho tháng ${data.month}/${data.year}`,
        });
        onImportSuccess?.();
      }

      if (data.failed > 0) {
        toast({
          title: "Cảnh báo",
          description: `${data.failed} bản ghi bị lỗi, vui lòng kiểm tra chi tiết`,
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : 'Lỗi không xác định',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `STT,MÃ NHÂN VIÊN,HỌ TÊN,PHÒNG BAN,NGÀY VÀO LÀM,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,TỔNG NGÀY CÔNG,TĂNG CA,Trễ,Sớm,TC,Phép,Lễ,N.Có Lương,N.Không Lương
1,00001,Nguyễn Văn A,Phòng IT,10/07/2025,,,,,,,,,,1,,,1,1,1,1,1,,,0.74,,1,0.99,,,,1,1,1,,11.73,0,62,123,185,,,0,19
2,00002,Trần Thị B,Phòng Kế toán,10/07/2025,,,,,,,0.54,,,,1,,,1,1,1,1,1,,,0.75,,1,1,1,,,1,1,,,12.29,0.58,149,218,367,,,0,18`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'monthly_attendance_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Import dữ liệu chấm công theo tháng
          </CardTitle>
          <CardDescription>
            Upload file CSV bảng chấm công tổng hợp theo tháng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="font-medium">Tải template mẫu</h4>
              <p className="text-sm text-muted-foreground">
                Tải file CSV mẫu bảng chấm công tháng
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Tải template
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {file ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">CSV</Badge>
                  <p className="font-medium">{file.name}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                  Chọn file khác
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Kéo thả file CSV vào đây hoặc click để chọn file
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Chọn file CSV
                </Button>
              </div>
            )}
          </div>

          {/* Upload Button */}
          {file && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload và Import
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Import Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Kết quả Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.success}</div>
                <div className="text-sm text-green-800">Thành công</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-sm text-red-800">Thất bại</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{result.warnings.length}</div>
                <div className="text-sm text-yellow-800">Cảnh báo</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tiến độ xử lý</span>
                <span>{result.success + result.failed} / {result.success + result.failed}</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Lỗi ({result.errors.length})
                </h4>
                <ScrollArea className="h-32 border rounded-lg">
                  <div className="p-3 space-y-2">
                    {result.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription className="text-sm">
                          <strong>Dòng {error.row} - {error.employee_code}:</strong> {error.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Cảnh báo ({result.warnings.length})
                </h4>
                <ScrollArea className="h-32 border rounded-lg">
                  <div className="p-3 space-y-2">
                    {result.warnings.map((warning, index) => (
                      <Alert key={index}>
                        <AlertDescription className="text-sm">
                          <strong>Dòng {warning.row} - {warning.employee_code}:</strong> {warning.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Hướng dẫn sử dụng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Cấu trúc file CSV bảng chấm công tháng:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>STT:</strong> Số thứ tự</li>
              <li><strong>MÃ NHÂN VIÊN:</strong> Mã định danh nhân viên trong hệ thống</li>
              <li><strong>HỌ TÊN:</strong> Họ tên đầy đủ của nhân viên</li>
              <li><strong>PHÒNG BAN:</strong> Phòng ban của nhân viên</li>
              <li><strong>NGÀY VÀO LÀM:</strong> Ngày bắt đầu làm việc</li>
              <li><strong>1-31:</strong> Số công cho mỗi ngày trong tháng (0-1)</li>
              <li><strong>TỔNG NGÀY CÔNG:</strong> Tổng số ngày công trong tháng</li>
              <li><strong>TĂNG CA:</strong> Tổng giờ tăng ca</li>
              <li><strong>Trễ/Sớm/TC:</strong> Số phút đi trễ, về sớm, tổng cộng</li>
              <li><strong>Phép/Lễ:</strong> Số ngày nghỉ phép/lễ</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Lưu ý quan trọng:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>File phải có định dạng CSV với encoding UTF-8</li>
              <li>Mã nhân viên phải tồn tại trong hệ thống</li>
              <li>Giá trị công: 1 = làm đủ ngày, 0.5 = nửa ngày, 0.75 = 3/4 ngày, v.v.</li>
              <li>Dữ liệu sẽ được import cho tháng/năm được chỉ định trong file</li>
              <li>Nếu đã có dữ liệu cho ngày đó, hệ thống sẽ cập nhật</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}