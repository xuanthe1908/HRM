"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Shield, QrCode, Smartphone, Loader2, CheckCircle, XCircle, Key, Copy, Clock } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

interface TwoFactorAuthProps {
  className?: string
}

interface TwoFAStatus {
  enabled: boolean
  required: boolean
  has2FA: boolean
  isVerified: boolean
  factors: any[]
  verifiedFactors: any[]
  unverifiedFactors: any[]
}

export function TwoFactorAuth({ className }: TwoFactorAuthProps) {
  const { user } = useAuth()
  const [status, setStatus] = useState<TwoFAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingUp, setSettingUp] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrData, setQrData] = useState<any>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  const fetch2FAStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch 2FA status')
      }

      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error fetching 2FA status:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tải trạng thái 2FA",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch2FAStatus()
  }, [])

  const setup2FA = async () => {
    try {
      setSettingUp(true)
      const response = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ factorType: 'totp' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to setup 2FA')
      }

      const data = await response.json()
      
      console.log('2FA setup response:', data);
      
      // Tạo QR code từ data
      if (data.qrCode) {
        try {
          const QRCode = (await import('qrcode')).default;
          const qrCodeDataUrl = await QRCode.toDataURL(data.qrCode);
          setQrCodeUrl(qrCodeDataUrl);
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
      
      if (!data.factor || !data.factor.id) {
        console.error('Invalid factor data:', data.factor);
        throw new Error('No valid factor data received from server');
      }
      
      setQrData({
        factor: data.factor,
        qrCode: data.qrCode,
        secret: data.secret
      })
      setShowQR(true)
      
      // Refresh trạng thái sau khi setup
      await fetch2FAStatus()
      
      toast({
        title: "Thành công",
        description: "2FA đã được thiết lập. Vui lòng quét mã QR để thêm vào ứng dụng xác thực.",
      })
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể thiết lập 2FA",
        variant: "destructive",
      })
    } finally {
      setSettingUp(false)
    }
  }

  const verifyOTP = async () => {
    if (!qrData || !verificationCode || !qrData.factor || !qrData.secret) {
      toast({
        title: "Lỗi",
        description: "Dữ liệu 2FA không hợp lệ",
        variant: "destructive",
      });
      return;
    }

    try {
      setVerifying(true)
      
      // Verify TOTP code
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          factorId: qrData.factor.id,
          code: verificationCode,
          secret: qrData.secret
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to verify 2FA')
      }

      toast({
        title: "Thành công",
        description: "2FA đã được xác thực thành công!",
      })

      setShowQR(false)
      setQrData(null)
      setVerificationCode('')
      setQrCodeUrl('')
      await fetch2FAStatus()
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Mã OTP không đúng",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  const remove2FA = async (factorId: string) => {
    try {
      const response = await fetch('/api/auth/2fa', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ factorId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove 2FA')
      }

      toast({
        title: "Thành công",
        description: "2FA đã được gỡ bỏ",
      })

      // Refresh status
      await fetch2FAStatus()
    } catch (error) {
      console.error('Error removing 2FA:', error)
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể gỡ bỏ 2FA",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Xác thực 2 bước
          </CardTitle>
          <CardDescription>Quản lý bảo mật tài khoản</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Đang tải...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Xác thực 2 bước
        </CardTitle>
        <CardDescription>Quản lý bảo mật tài khoản</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Trạng thái 2FA</span>
              {status.isVerified ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Đã xác thực
                </Badge>
              ) : status.has2FA ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Chờ xác thực
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Chưa bật
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {status.required 
                ? "Bắt buộc cho Admin và HR" 
                : "Tùy chọn cho tài khoản của bạn"
              }
            </p>
          </div>
        </div>

        {status.required && !status.isVerified && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">2FA bắt buộc</p>
                <p>Vì bạn là {user?.role}, 2FA là bắt buộc để bảo mật tài khoản.</p>
                {status.has2FA && !status.isVerified && (
                  <p className="mt-1 text-yellow-700">Bạn đã thiết lập 2FA nhưng chưa xác thực. Vui lòng hoàn tất quá trình xác thực.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {status.verifiedFactors.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Thiết bị đã xác thực</h4>
            {status.verifiedFactors.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium">{factor.friendly_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {factor.factor_type === 'totp' ? 'Authenticator App' : 'Security Key'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remove2FA(factor.id)}
                >
                  Gỡ bỏ
                </Button>
              </div>
            ))}
          </div>
        )}

        {status.unverifiedFactors.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Thiết bị chờ xác thực</h4>
            {status.unverifiedFactors.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="font-medium">{factor.friendly_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {factor.factor_type === 'totp' ? 'Authenticator App' : 'Security Key'} - Chờ xác thực
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remove2FA(factor.id)}
                >
                  Gỡ bỏ
                </Button>
              </div>
            ))}
          </div>
        )}

        {status.required && !status.isVerified && (
          <Button 
            onClick={setup2FA} 
            disabled={settingUp}
            className="w-full"
          >
            {settingUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <QrCode className="mr-2 h-4 w-4" />
            {status.has2FA ? 'Tiếp tục xác thực' : 'Thiết lập 2FA'}
          </Button>
        )}

        {!status.required && !status.isVerified && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Tăng cường bảo mật</p>
                <p>Bật 2FA để bảo vệ tài khoản tốt hơn.</p>
              </div>
            </div>
            <Button 
              onClick={setup2FA} 
              disabled={settingUp}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              {settingUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <QrCode className="mr-2 h-4 w-4" />
              {status.has2FA ? 'Tiếp tục xác thực' : 'Thiết lập 2FA'}
            </Button>
          </div>
        )}

        {/* QR Code Setup Modal */}
        {showQR && qrData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Thiết lập 2FA</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quét mã QR bằng ứng dụng xác thực
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  {qrCodeUrl ? (
                    <div className="flex justify-center">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code" 
                        className="w-48 h-48 border rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="p-8 bg-gray-100 rounded-lg">
                      <p className="text-sm text-gray-500">Đang tạo QR code...</p>
                    </div>
                  )}
                  
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Hoặc nhập mã thủ công:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 font-mono">
                        {qrData.secret}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(qrData.secret);
                          toast({
                            title: "Đã sao chép",
                            description: "Mã secret đã được sao chép vào clipboard",
                          });
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Nhập mã từ ứng dụng:</label>
                    <Input
                      type="text"
                      placeholder="Nhập 6 chữ số"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="mt-1"
                      maxLength={6}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={verifyOTP}
                      disabled={verifying || verificationCode.length !== 6}
                      className="flex-1"
                    >
                      {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Xác thực
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowQR(false)
                        setQrData(null)
                        setVerificationCode('')
                        setQrCodeUrl('')
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 