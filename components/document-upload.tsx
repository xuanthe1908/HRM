'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, File, Trash2, Download, Eye } from 'lucide-react';
import { apiClient } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Document {
  type: string;
  name: string;
  url?: string;
  path: string;
}

interface DocumentUploadProps {
  employeeId: string;
  documentType: string;
  documentName: string;
  existingDocument?: Document;
  onUploadSuccess?: (filePath?: string | string[]) => void;
  disabled?: boolean;
  multiple?: boolean;
}

export function DocumentUpload({
  employeeId,
  documentType,
  documentName,
  existingDocument,
  onUploadSuccess,
  disabled = false,
  multiple = false
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;

    setError('');
    setSuccess('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const uploadedPaths: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);

        const response = await fetch(`/api/employees/${employeeId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Lỗi upload file');
        }

        const result = await response.json();
        uploadedPaths.push(result.filePath);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      setSuccess(`Tải lên thành công: ${uploadedPaths.length} file`);
      onUploadSuccess?.(multiple ? uploadedPaths : uploadedPaths[0]);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Lỗi không xác định');
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setSuccess('');
      }, 3000);
    }
  };

  const handleDelete = async () => {
    if (!existingDocument || disabled) return;

    try {
      setError('');
      
      const response = await fetch(
        `/api/employees/${employeeId}/documents?filePath=${encodeURIComponent(existingDocument.path)}&documentType=${documentType}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi xóa file');
      }

      setSuccess('Xóa tài liệu thành công');
      onUploadSuccess?.();

    } catch (error) {
      console.error('Delete error:', error);
      setError(error instanceof Error ? error.message : 'Lỗi không xác định');
    }
  };

  const handleView = () => {
    if (existingDocument?.url) {
      window.open(existingDocument.url, '_blank');
    }
  };

  const handleDownload = () => {
    if (existingDocument?.url) {
      const link = document.createElement('a');
      link.href = existingDocument.url;
      link.download = existingDocument.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {existingDocument ? (
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {documentName}
              </span>
              <span className="text-xs text-gray-500">
                (Đã có tài liệu)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {documentName}
              </span>
              <span className="text-xs text-gray-400">
                (Chưa có tài liệu)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {existingDocument && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleView}
                disabled={disabled}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={disabled}
              >
                <Download className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc chắn muốn xóa "{documentName}"? Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFileSelect}
            disabled={disabled || isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {existingDocument ? 'Thay thế' : 'Tải lên'}
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx"
        multiple={multiple}
        onChange={handleFileChange}
      />

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Đang tải lên...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Success message */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* File info */}
      <div className="text-xs text-gray-500">
        Hỗ trợ: JPG, PNG, PDF, DOC, DOCX (tối đa 10MB)
      </div>
    </div>
  );
}
