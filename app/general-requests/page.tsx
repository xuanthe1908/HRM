'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Filter, Eye, CheckCircle, XCircle, Clock, Users, FileText } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { EmployeeRequestService } from '@/lib/employee-request-service';
import { EmployeeRequest, ReviewRequest } from '@/types/employee-request';
import { toast } from 'sonner';

export default function GeneralRequestsPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Load requests
  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await EmployeeRequestService.getEmployeeRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Không thể tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Filter requests (safely handle undefined fields)
  const filteredRequests = (requests ?? []).filter((request) => {
    const nameLower = (request.employee?.name ?? '').toLowerCase();
    const codeLower = (request.employee?.employee_code ?? '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = nameLower.includes(term) || codeLower.includes(term);
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle review
  const handleReview = (request: EmployeeRequest) => {
    setSelectedRequest(request);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    setIsReviewing(true);
    try {
      await EmployeeRequestService.reviewRequest(selectedRequest.id, {
        status,
        review_notes: reviewNotes || undefined
      });

      toast.success(`Yêu cầu đã được ${status === 'approved' ? 'phê duyệt' : 'từ chối'}`);
      setShowReviewModal(false);
      loadRequests(); // Reload to get updated data
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error('Không thể cập nhật yêu cầu');
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Chờ duyệt', variant: 'outline' as const, icon: Clock },
      approved: { label: 'Đã duyệt', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Từ chối', variant: 'destructive' as const, icon: XCircle }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Đang tải danh sách yêu cầu...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard allowedDbRoles={["admin", "hr"]}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Yêu cầu chung</h1>
            <p className="text-muted-foreground">Quản lý các yêu cầu từ nhân viên</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Tìm kiếm theo tên hoặc mã nhân viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="rejected">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Không có yêu cầu nào</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Không tìm thấy yêu cầu phù hợp với bộ lọc'
                    : 'Chưa có yêu cầu nào được gửi'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const statusInfo = getStatusBadge(request.status);
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {request.employee?.name || 'Không xác định'}
                          </h3>
                          <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-3">
                          <p>Mã NV: {request.employee?.employee_code || 'N/A'}</p>
                          <p>Loại yêu cầu: {request.request_type === 'dependent_persons' ? 'Cập nhật số người phụ thuộc' : request.request_type}</p>
                          <p>Ngày tạo: {formatDate(request.created_at)}</p>
                        </div>

                        {request.request_type === 'dependent_persons' && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="font-medium mb-2">Chi tiết yêu cầu:</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Số hiện tại:</span>
                                <span className="ml-2 font-medium">{request.request_data.current_count}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Số yêu cầu:</span>
                                <span className="ml-2 font-medium">{request.request_data.requested_count}</span>
                              </div>
                              {request.request_data.reason && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Lý do:</span>
                                  <p className="mt-1">{request.request_data.reason}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {request.reviewed_at && (
                          <div className="mt-3 text-sm">
                            <p className="text-muted-foreground">
                              Duyệt bởi: {request.reviewer?.name || 'N/A'} 
                              <span className="ml-2">({formatDate(request.reviewed_at)})</span>
                            </p>
                            {request.review_notes && (
                              <p className="text-muted-foreground mt-1">
                                Ghi chú: {request.review_notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(request)}
                          disabled={request.status !== 'pending'}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {request.status === 'pending' ? 'Duyệt' : 'Xem'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Review Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Duyệt yêu cầu</DialogTitle>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Thông tin yêu cầu</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nhân viên:</span>
                      <p className="font-medium">{selectedRequest.employee?.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mã NV:</span>
                      <p className="font-medium">{selectedRequest.employee?.employee_code}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Loại:</span>
                      <p className="font-medium">
                        {selectedRequest.request_type === 'dependent_persons' 
                          ? 'Cập nhật số người phụ thuộc' 
                          : selectedRequest.request_type
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ngày tạo:</span>
                      <p className="font-medium">{formatDate(selectedRequest.created_at)}</p>
                    </div>
                  </div>

                  {selectedRequest.request_type === 'dependent_persons' && (
                    <div className="mt-4 p-3 bg-white rounded border">
                      <h5 className="font-medium mb-2">Chi tiết yêu cầu:</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Số hiện tại:</span>
                          <span className="ml-2 font-medium">{selectedRequest.request_data.current_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Số yêu cầu:</span>
                          <span className="ml-2 font-medium">{selectedRequest.request_data.requested_count}</span>
                        </div>
                        {selectedRequest.request_data.reason && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Lý do:</span>
                            <p className="mt-1">{selectedRequest.request_data.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Ghi chú (tùy chọn)</label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Nhập ghi chú về quyết định duyệt..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                disabled={isReviewing}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={() => submitReview('rejected')}
                disabled={isReviewing}
              >
                {isReviewing ? 'Đang xử lý...' : 'Từ chối'}
              </Button>
              <Button
                onClick={() => submitReview('approved')}
                disabled={isReviewing}
              >
                {isReviewing ? 'Đang xử lý...' : 'Phê duyệt'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
