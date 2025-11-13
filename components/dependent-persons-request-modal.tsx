'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertCircle } from 'lucide-react';
import { EmployeeRequestService } from '@/lib/employee-request-service';
import { toast } from 'sonner';
import { DocumentUpload } from '@/components/document-upload';

interface DependentPersonsRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  onSuccess?: () => void;
  employeeId: string;
}

export function DependentPersonsRequestModal({
  isOpen,
  onClose,
  currentCount,
  onSuccess,
  employeeId
}: DependentPersonsRequestModalProps) {
  const [requestedCount, setRequestedCount] = useState<number>(currentCount);
  const [reason, setReason] = useState('');
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (requestedCount < 0) {
      setError('Số người phụ thuộc không thể âm');
      return;
    }

    if (requestedCount === currentCount) {
      setError('Số người phụ thuộc mới phải khác số hiện tại');
      return;
    }

    if (supportingDocuments.length === 0) {
      setError('Vui lòng tải lên tài liệu chứng minh');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await EmployeeRequestService.createDependentPersonsRequest({
        current_count: currentCount,
        requested_count: requestedCount,
        reason: reason || undefined,
        supporting_documents: supportingDocuments
      });

      toast.success('Yêu cầu đã được gửi thành công');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating dependent persons request:', error);
      setError('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadSuccess = (paths?: string | string[]) => {
    if (!paths) return;
    const newPaths = Array.isArray(paths) ? paths : [paths];
    setSupportingDocuments(newPaths);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yêu cầu cập nhật số người phụ thuộc</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currentCount">Số người phụ thuộc hiện tại</Label>
              <Input
                id="currentCount"
                value={currentCount}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="requestedCount">Số người phụ thuộc yêu cầu *</Label>
              <Input
                id="requestedCount"
                type="number"
                min="0"
                value={requestedCount}
                onChange={(e) => setRequestedCount(parseInt(e.target.value) || 0)}
                placeholder="Nhập số người phụ thuộc"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Lý do thay đổi</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Giải thích lý do thay đổi số người phụ thuộc..."
              rows={3}
            />
          </div>

          <div>
            <Label>Tài liệu chứng minh (bắt buộc)</Label>
            <div className="mt-2">
              <DocumentUpload
                employeeId={employeeId}
                documentType="dependent_request"
                documentName="Tài liệu chứng minh người phụ thuộc"
                multiple
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Yêu cầu của bạn sẽ được gửi đến HR/Admin để xem xét. Bạn có thể tiếp tục sử dụng hệ thống 
              mà không cần chờ phê duyệt.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
