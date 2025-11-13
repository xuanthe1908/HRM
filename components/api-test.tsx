'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { employeeService, departmentService, positionService } from '@/lib/services';

export function ApiTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    employees: { success: boolean; message: string };
    departments: { success: boolean; message: string };
    positions: { success: boolean; message: string };
  }>({
    employees: { success: false, message: '' },
    departments: { success: false, message: '' },
    positions: { success: false, message: '' },
  });

  const testApiConnection = async () => {
    setLoading(true);
    setResults({
      employees: { success: false, message: '' },
      departments: { success: false, message: '' },
      positions: { success: false, message: '' },
    });

    try {
      // Test employees endpoint
      const employeesResponse = await employeeService.getEmployees();
      setResults(prev => ({
        ...prev,
        employees: {
          success: !employeesResponse.error,
          message: employeesResponse.error || `Success: ${employeesResponse.data?.length || 0} employees found`
        }
      }));

      // Test departments endpoint
      const departmentsResponse = await departmentService.getDepartments();
      setResults(prev => ({
        ...prev,
        departments: {
          success: !departmentsResponse.error,
          message: departmentsResponse.error || `Success: ${departmentsResponse.data?.length || 0} departments found`
        }
      }));

      // Test positions endpoint
      const positionsResponse = await positionService.getPositions();
      setResults(prev => ({
        ...prev,
        positions: {
          success: !positionsResponse.error,
          message: positionsResponse.error || `Success: ${positionsResponse.data?.length || 0} positions found`
        }
      }));

    } catch (error) {
      console.error('API test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Connection Test</CardTitle>
        <CardDescription>
          Test the connection to the FastAPI backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testApiConnection} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing API...
            </>
          ) : (
            'Test API Connection'
          )}
        </Button>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            {results.employees.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : results.employees.message ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : null}
            <span className="font-medium">Employees API:</span>
            <span className="text-sm text-muted-foreground">
              {results.employees.message || 'Not tested'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {results.departments.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : results.departments.message ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : null}
            <span className="font-medium">Departments API:</span>
            <span className="text-sm text-muted-foreground">
              {results.departments.message || 'Not tested'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {results.positions.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : results.positions.message ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : null}
            <span className="font-medium">Positions API:</span>
            <span className="text-sm text-muted-foreground">
              {results.positions.message || 'Not tested'}
            </span>
          </div>
        </div>

        {Object.values(results).some(r => r.message && !r.success) && (
          <Alert variant="destructive">
            <AlertDescription>
              Some API endpoints failed. Make sure your backend is running on http://localhost:8000
            </AlertDescription>
          </Alert>
        )}

        {Object.values(results).every(r => r.success) && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All API endpoints are working correctly!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 