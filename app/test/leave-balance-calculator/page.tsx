"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface CalculationResult {
  totalEarnedDays: number;
  monthsWorked: number;
  nextEarningDate: Date | null;
}

// Logic tính toán nghỉ phép (copy từ LeaveBalanceService)
function calculateLeaveBalance(
  officialStartDate: Date,
  currentDate: Date = new Date()
): CalculationResult {
  if (!officialStartDate) {
    return {
      totalEarnedDays: 0,
      monthsWorked: 0,
      nextEarningDate: null
    };
  }

  const startDate = new Date(officialStartDate);
  const today = new Date(currentDate);

  if (today < startDate) {
    return {
      totalEarnedDays: 0,
      monthsWorked: 0,
      nextEarningDate: startDate
    };
  }

  let earnedDays = 0;
  let monthsWorked = 0;
  let nextEarningDate: Date | null = null;

  // Nếu bắt đầu từ ngày 1 của tháng, có ngay 1 ngày nghỉ phép
  if (startDate.getDate() === 1) {
    // Tính số tháng từ tháng bắt đầu đến hiện tại
    const currentMonth = today.getFullYear() * 12 + today.getMonth();
    const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
    
    const totalMonths = currentMonth - startMonth + 1;
    earnedDays = totalMonths;
    monthsWorked = totalMonths;
    
    // Ngày earning tiếp theo là ngày 1 của tháng sau
    nextEarningDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  } else {
    // Nếu bắt đầu giữa tháng, phải chờ đến đầu tháng tiếp theo
    const firstEarningDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      1
    );

    if (today >= firstEarningDate) {
      // Tính số tháng từ ngày earning đầu tiên đến hiện tại
      const currentMonth = today.getFullYear() * 12 + today.getMonth();
      const firstEarningMonth = firstEarningDate.getFullYear() * 12 + firstEarningDate.getMonth();
      
      earnedDays = currentMonth - firstEarningMonth + 1;
      monthsWorked = earnedDays;
      
      // Ngày earning tiếp theo là ngày 1 của tháng sau
      nextEarningDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    } else {
      // Chưa đến ngày earning đầu tiên
      earnedDays = 0;
      monthsWorked = 0;
      nextEarningDate = firstEarningDate;
    }
  }

  return {
    totalEarnedDays: Math.max(0, earnedDays),
    monthsWorked: Math.max(0, monthsWorked),
    nextEarningDate
  };
}

export default function LeaveBalanceCalculatorPage() {
  const [officialStartDate, setOfficialStartDate] = useState("")
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [usedDays, setUsedDays] = useState(0)
  const [result, setResult] = useState<CalculationResult | null>(null)

  const handleCalculate = () => {
    if (!officialStartDate) return;
    
    const startDate = new Date(officialStartDate);
    const checkDate = new Date(currentDate);
    
    const calculation = calculateLeaveBalance(startDate, checkDate);
    setResult(calculation);
  }

  const remainingDays = result ? Math.max(0, result.totalEarnedDays - usedDays) : 0;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Tính Toán Ngày Nghỉ Phép</h1>
        <p className="text-muted-foreground">
          Công cụ kiểm tra logic tính toán ngày nghỉ phép dựa trên ngày bắt đầu chính thức
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin đầu vào</CardTitle>
            <CardDescription>
              Nhập ngày bắt đầu chính thức và ngày hiện tại để tính toán
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="officialStartDate">Ngày bắt đầu chính thức *</Label>
              <Input
                id="officialStartDate"
                type="date"
                value={officialStartDate}
                onChange={(e) => setOfficialStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentDate">Ngày hiện tại (để tính toán)</Label>
              <Input
                id="currentDate"
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usedDays">Số ngày đã sử dụng</Label>
              <Input
                id="usedDays"
                type="number"
                min="0"
                value={usedDays}
                onChange={(e) => setUsedDays(parseInt(e.target.value) || 0)}
              />
            </div>

            <Button onClick={handleCalculate} className="w-full">
              Tính toán
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle>Kết quả tính toán</CardTitle>
            <CardDescription>
              Logic: 1 ngày nghỉ phép mỗi tháng từ ngày bắt đầu chính thức
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 mb-1">Tháng đã làm việc</div>
                    <div className="text-lg font-bold text-blue-700">
                      {result.monthsWorked}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="text-xs text-green-600 mb-1">Ngày đã tích lũy</div>
                    <div className="text-lg font-bold text-green-700">
                      {result.totalEarnedDays}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <div className="text-xs text-orange-600 mb-1">Đã sử dụng</div>
                    <div className="text-lg font-bold text-orange-700">
                      {usedDays}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="text-xs text-purple-600 mb-1">Còn lại</div>
                    <div className="text-lg font-bold text-purple-700">
                      {remainingDays}
                    </div>
                  </div>
                </div>

                {result.nextEarningDate && (
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                    <div className="text-xs text-indigo-600 mb-1">Ngày tích lũy tiếp theo</div>
                    <div className="font-semibold text-indigo-700">
                      {result.nextEarningDate.toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                )}

                {/* Logic explanation */}
                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Giải thích logic:</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {officialStartDate && (
                      <>
                        <div>
                          • Ngày bắt đầu: {new Date(officialStartDate).toLocaleDateString("vi-VN")} 
                          {new Date(officialStartDate).getDate() === 1 ? 
                            " (Ngày 1 → có ngay 1 ngày nghỉ phép)" : 
                            " (Giữa tháng → chờ đến đầu tháng sau)"}
                        </div>
                        <div>
                          • Ngày kiểm tra: {new Date(currentDate).toLocaleDateString("vi-VN")}
                        </div>
                        <div>
                          • Cách tính: 1 ngày nghỉ phép mỗi tháng từ {new Date(officialStartDate).getDate() === 1 ? 
                            "tháng bắt đầu" : "tháng tiếp theo"}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Vui lòng nhập thông tin và nhấn "Tính toán"
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Các test case mẫu</CardTitle>
          <CardDescription>
            Một số trường hợp thử nghiệm để kiểm tra logic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border rounded-lg p-3 space-y-2">
              <div className="font-medium text-sm">Bắt đầu ngày 1/6/2024</div>
              <div className="text-xs text-gray-600">
                Kiểm tra ngày 1/7/2024 → 2 ngày nghỉ phép
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setOfficialStartDate("2024-06-01");
                  setCurrentDate("2024-07-01");
                  setUsedDays(0);
                }}
              >
                Test
              </Button>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="font-medium text-sm">Bắt đầu ngày 15/6/2024</div>
              <div className="text-xs text-gray-600">
                Kiểm tra ngày 1/7/2024 → 1 ngày nghỉ phép
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setOfficialStartDate("2024-06-15");
                  setCurrentDate("2024-07-01");
                  setUsedDays(0);
                }}
              >
                Test
              </Button>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="font-medium text-sm">Bắt đầu ngày 15/6/2024</div>
              <div className="text-xs text-gray-600">
                Kiểm tra ngày 30/6/2024 → 0 ngày nghỉ phép
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setOfficialStartDate("2024-06-15");
                  setCurrentDate("2024-06-30");
                  setUsedDays(0);
                }}
              >
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}