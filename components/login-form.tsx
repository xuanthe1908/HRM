'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryMode, setRecoveryMode] = useState(false);
  
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (!result.success) {
        if (result.error === 'Tài khoản đã bị vô hiệu hóa') {
          setError(result.message || 'Tài khoản của bạn đã bị vô hiệu hóa do đã nghỉ việc. Vui lòng liên hệ quản trị viên nếu có thắc mắc.');
        } else {
          setError(result.error || 'Email hoặc mật khẩu không hợp lệ.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Đã xảy ra lỗi trong quá trình đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/password-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Yêu cầu khôi phục mật khẩu thất bại.');
      }
      
      setMessage(data.message);
      
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
                            {isRecoveryMode ? 'Khôi phục mật khẩu' : 'Đăng nhập TDSolution'}
          </CardTitle>
          <CardDescription className="text-center">
            {isRecoveryMode 
              ? 'Nhập email của bạn để nhận liên kết khôi phục.' 
              : 'Nhập thông tin đăng nhập của bạn.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isRecoveryMode ? handlePasswordRecovery : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {!isRecoveryMode && (
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive" className={error.includes('vô hiệu hóa') ? 'border-red-500 bg-red-50' : ''}>
                <AlertDescription>
                  {error.includes('vô hiệu hóa') ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">🚫</span>
                        </div>
                        <div className="font-semibold text-red-800 text-base">
                          Tài khoản đã bị vô hiệu hóa
                        </div>
                      </div>
                      
                      <div className="text-sm text-red-700 leading-relaxed pl-10">
                        {error}
                      </div>
                      
                      <div className="pl-10 space-y-2">
                        <div className="text-xs bg-red-100 p-3 rounded-lg border-l-4 border-red-400">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span>💡</span>
                              <strong className="text-red-800">Lý do:</strong>
                              <span className="text-red-700">Nhân viên đã nghỉ việc</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>📞</span>
                              <strong className="text-red-800">Hỗ trợ:</strong>
                              <span className="text-red-700">Liên hệ quản trị viên để biết thêm chi tiết</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>⏰</span>
                              <strong className="text-red-800">Trạng thái:</strong>
                              <span className="text-red-700">Vĩnh viễn vô hiệu hóa</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-red-500">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert variant="default">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRecoveryMode ? 'Đang gửi...' : 'Đang đăng nhập...'}
                </>
              ) : (
                isRecoveryMode ? 'Gửi liên kết khôi phục' : 'Đăng nhập'
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            <Button 
              variant="link" 
              onClick={() => {
                setRecoveryMode(!isRecoveryMode);
                setError('');
                setMessage('');
              }}
            >
              {isRecoveryMode ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
