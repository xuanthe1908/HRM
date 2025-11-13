"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  Calendar,
  Building2,
  Wallet,
  ArrowUpDown,
  BarChart3,
  Filter,
  AlertTriangle,
  Target,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { financialsService, budgetService, financialTargetService, departmentService, budgetCategoriesService, budgetAllocationsService, expenseRequestService } from "@/lib/services"
import type { FinancialTransaction } from "@/types/financial"
import { formatCurrency } from "@/utils/currency"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import BudgetCategoryManager from "@/components/budget-category-manager"

export default function FinancialsPage() {
  const { t, formatCurrency } = useLanguage()
  const router = useRouter()
  const { toast } = useToast()

  // Helper function to flatten budget categories tree
  const flattenCategories = (categories: any[]): any[] => {
    console.log('🔧 flattenCategories called with:', { 
      categories, 
      isArray: Array.isArray(categories), 
      length: categories?.length 
    })
    
    const result: any[] = []
    
    // Check if categories is valid array
    if (!Array.isArray(categories)) {
      console.error('❌ flattenCategories: categories is not an array:', categories)
      return []
    }
    
    if (categories.length === 0) {
      console.log('⚠️ flattenCategories: categories array is empty')
      return []
    }
    
    // Check if categories is already flat or if it's a tree structure
    const isTreeStructure = categories.some(cat => cat && cat.children && Array.isArray(cat.children));
    console.log('📊 Structure type:', isTreeStructure ? 'Tree' : 'Flat');
    
    if (!isTreeStructure) {
      // If it's already flat, just format for display
      categories.forEach(cat => {
        if (cat && cat.id && cat.code && cat.name) {
          // Calculate level based on parent_id or level field
          const level = cat.level || 0;
          result.push({
            ...cat,
            displayName: `${'  '.repeat(level)}${cat.code} - ${cat.name}`,
            level
          })
        }
      });
    } else {
      // Process tree structure
      const flatten = (cats: any[], level: number = 0) => {
        // Safety check
        if (!Array.isArray(cats)) {
          console.error('❌ flatten: cats is not an array:', cats)
          return
        }
        
        cats.forEach(cat => {
          if (cat && cat.id && cat.code && cat.name) {
            result.push({
              ...cat,
              displayName: `${'  '.repeat(level)}${cat.code} - ${cat.name}`,
              level
            })
            if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
              flatten(cat.children, level + 1)
            }
          } else {
            console.warn('⚠️ Invalid category object:', cat)
          }
        })
      }
      
      flatten(categories)
    }
    
    console.log('✅ flattenCategories result:', result.length, 'items')
    return result
  }

  // Data States
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])
  const [financialTargets, setFinancialTargets] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [budgetCategories, setBudgetCategories] = useState<any[]>([])
  const [budgetAllocations, setBudgetAllocations] = useState<any[]>([])
  const [expenseRequests, setExpenseRequests] = useState<any[]>([])
  
  // UI & Control States
  const [loading, setLoading] = useState(true)
  const [activeBudget, setActiveBudget] = useState<any>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  // Removed unused transfer dialog state
  const [isCreateTargetDialogOpen, setIsCreateTargetDialogOpen] = useState(false)
  const [isCreateBudgetDialogOpen, setIsCreateBudgetDialogOpen] = useState(false)
  const [isEditBudgetDialogOpen, setIsEditBudgetDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<any>(null)
  const [selectedCategoryForBudget, setSelectedCategoryForBudget] = useState<string>('')
  const [budgetName, setBudgetName] = useState<string>('')
  const [selectedCategoryForTransaction, setSelectedCategoryForTransaction] = useState<string>('')
  const [isEditTargetDialogOpen, setIsEditTargetDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<any>(null)
  // Removed unused state - transaction type is now determined by category
  
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);

  // Unified state for period management
  const [view, setView] = useState<{ type: 'month' | 'quarter' | 'year', date: Date }>({ type: 'month', date: new Date() });
  
  const [error, setError] = useState<string | null>(null)
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingBudgetData, setPendingBudgetData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overwriteLoading, setOverwriteLoading] = useState(false);
  const [conflictBudgetId, setConflictBudgetId] = useState<string | null>(null);
  const [isCreatingBudget, setIsCreatingBudget] = useState(false)
  const [isCreatingTarget, setIsCreatingTarget] = useState(false)
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false)
  const [isDeletingTransaction, setIsDeletingTransaction] = useState<string | null>(null)
  const [isUpdatingTransactionStatus, setIsUpdatingTransactionStatus] = useState<string | null>(null)
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<any>(null)
  const [showBudgetCategoryManager, setShowBudgetCategoryManager] = useState(false)

  // Helper to get date parts
  const getDateParts = (d: Date) => ({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    quarter: Math.floor(d.getMonth() / 3) + 1,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { year, month, quarter } = getDateParts(view.date);

      const [budgetRes, financialsRes, targetsRes, deptsRes, categoriesRes, expenseRes] = await Promise.all([
        budgetService.getBudgets(
          year,
          view.type === 'month' ? month : undefined,
          view.type === 'quarter' ? quarter : undefined
        ),
        financialsService.getFinancialsData(),
        financialTargetService.getTargets(),
        departmentService.getDepartments(),
        budgetCategoriesService.getCategories({ tree: true }),
        expenseRequestService.getExpenseRequests({ status: 'approved' }),
      ]);

      if (budgetRes.data) {
        setActiveBudget(budgetRes.data);
      } else {
        setActiveBudget(null);
      }
      
      if (financialsRes.data) {
        setTransactions(financialsRes.data.transactions || []);
        setCategories(financialsRes.data.categories || []);
      }
      
      if (targetsRes.data) setFinancialTargets(targetsRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      // Handle budget categories with nested data structure
      if (categoriesRes.data) {
        let actualData = categoriesRes.data;
        // Check for nested data structure: {data: {data: Array}}
        if (typeof actualData === 'object' && actualData !== null && 'data' in actualData && Array.isArray((actualData as any).data)) {
          actualData = (actualData as any).data;
        }
        // Ensure it's an array
        if (Array.isArray(actualData)) {
          console.log('✅ Budget categories loaded:', actualData.length, 'categories');
          setBudgetCategories(actualData);
        } else {
          console.error('❌ Budget categories data is not an array:', actualData);
          setBudgetCategories([]);
        }
      } else {
        console.log('⚠️ No budget categories data received');
        setBudgetCategories([]);
      }
      if (expenseRes.data) setExpenseRequests(expenseRes.data);

      // Fetch budget allocations if we have an active budget
      if (budgetRes.data && typeof budgetRes.data === 'object' && budgetRes.data !== null && 'id' in budgetRes.data) {
        const allocationsRes = await budgetAllocationsService.getAllocations({ budget_id: (budgetRes.data as any).id });
        if (allocationsRes.data) setBudgetAllocations(allocationsRes.data);
      }
      
    } catch (error) {
      console.error("A critical error occurred during fetch:", error);
      setError("Lỗi nghiêm trọng, không thể tải dữ liệu trang.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate budget name when category is selected
  useEffect(() => {
    console.log('🔄 Auto-generate budget name:', { 
      selectedCategoryForBudget, 
      budgetCategoriesLength: budgetCategories.length,
      budgetCategories: budgetCategories
    });
    
    if (selectedCategoryForBudget && budgetCategories.length > 0) {
      try {
        const flattenedCategories = flattenCategories(budgetCategories);
        const selectedCategory = flattenedCategories.find(cat => cat.id === selectedCategoryForBudget);
        if (selectedCategory) {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const newName = `Dự toán ${selectedCategory.name} ${currentMonth}/${currentYear}`;
          console.log('✅ Generated budget name:', newName);
          setBudgetName(newName);
        } else {
          console.warn('⚠️ Selected category not found in flattened list');
        }
      } catch (error) {
        console.error('❌ Error in auto-generate budget name:', error);
      }
    } else {
      setBudgetName('');
    }
  }, [selectedCategoryForBudget, budgetCategories]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isCreateBudgetDialogOpen) {
      setSelectedCategoryForBudget('');
      setBudgetName('');
    }
  }, [isCreateBudgetDialogOpen]);

  // Reset transaction form when dialog closes
  useEffect(() => {
    if (!isAddDialogOpen) {
      setSelectedCategoryForTransaction('');
    }
  }, [isAddDialogOpen]);

  useEffect(() => {
    fetchData();
  }, [view]);

  const handlePeriodChange = (direction: 'next' | 'prev') => {
    setView(currentView => {
      const newDate = new Date(currentView.date);
      const increment = direction === 'next' ? 1 : -1;
      
      switch (currentView.type) {
        case 'month':
          newDate.setMonth(newDate.getMonth() + increment);
          break;
        case 'quarter':
          newDate.setMonth(newDate.getMonth() + (increment * 3));
          break;
        case 'year':
          newDate.setFullYear(newDate.getFullYear() + increment);
          break;
      }
      return { ...currentView, date: newDate };
    });
  };
  
  const periodTitle = useMemo(() => {
    const { year, month, quarter } = getDateParts(view.date);
    switch (view.type) {
        case 'month': return `Tháng ${month}, ${year}`;
        case 'quarter': return `Quý ${quarter}, ${year}`;
        case 'year': return `Năm ${year}`;
        default: return '';
    }
  }, [view]);

  // Memos for calculations
  const departmentMap = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, `${c.code} - ${c.name}`])), [categories]);

  // Lấy khoảng thời gian báo cáo
  const { reportStartDate, reportEndDate } = useMemo(() => {
    const now = new Date(view.date);
    let startDate: Date;
    let endDate: Date;

    switch (view.type) {
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }
    
    return { reportStartDate: startDate, reportEndDate: endDate };
  }, [view]);

  const timeFilteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    // Sử dụng start/end date đã được tính toán ở trên
    const startDate = reportStartDate;
    const endDate = reportEndDate;
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return transactions.filter(t => {
      if (!t || !t.date) return false;
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });
  }, [transactions, reportStartDate, reportEndDate]);

  const approvedTransactions = useMemo(() => 
    timeFilteredTransactions.filter(t => t && t.status === 'approved'), 
    [timeFilteredTransactions]
  );

  // 3. Tính toán các chỉ số chính TỪ DỮ LIỆU ĐÃ LỌC
  const { totalIncome, totalExpense, netProfit } = useMemo(() => {
    const income = approvedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = approvedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome: income, totalExpense: expense, netProfit: income - expense };
  }, [approvedTransactions]);

  // 4. Tính toán các breakdown SAU KHI đã có các chỉ số chính
  const incomeByCategory = useMemo(() => {
    if (!approvedTransactions || approvedTransactions.length === 0) return [];
    const map = new Map<string, number>();
    approvedTransactions.filter(t => t.type === 'income').forEach(t => {
      const categoryName = categoryMap.get(t.category_id) || 'Khác';
      map.set(categoryName, (map.get(categoryName) || 0) + t.amount);
    });
    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount, percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0 }));
  }, [approvedTransactions, categoryMap, totalIncome]);

  const expenseByCategory = useMemo(() => {
    if (!approvedTransactions || approvedTransactions.length === 0) return [];
    const map = new Map<string, number>();
    approvedTransactions.filter(t => t.type === 'expense').forEach(t => {
      const categoryName = categoryMap.get(t.category_id) || 'Khác';
      map.set(categoryName, (map.get(categoryName) || 0) + t.amount);
    });
    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount, percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0 }));
  }, [approvedTransactions, categoryMap, totalExpense]);

  const processedTargets = useMemo(() => {
    if (!financialTargets) return [];
    
    const { year, month, quarter } = getDateParts(view.date);

    const relevantTargets = financialTargets.filter(target => {
      if (target.year !== year) return false;

      // Yearly targets are always relevant for the year's views
      if (target.period_type === 'year') {
        return true;
      }
      
      // Quarterly targets are relevant for the specific quarter view, or any month within that quarter
      if (target.period_type === 'quarter') {
        if (view.type === 'quarter' && target.period_value === quarter) return true;
        if (view.type === 'month' && target.period_value === quarter) return true;
        return false;
      }
      
      // Monthly targets are only relevant for the specific month view
      if (target.period_type === 'month') {
        return view.type === 'month' && target.period_value === month;
      }

      return false;
    });

    return relevantTargets.map(target => {
      let currentAmount = 0;
      // The income/profit are already filtered by the view, so this calculation is correct.
      if (target.target_type === 'revenue') currentAmount = totalIncome;
      else if (target.target_type === 'profit') currentAmount = netProfit;
      
      return { 
        ...target, 
        current_amount: currentAmount, 
        department_name: departmentMap.get(target.assigned_to_id) || 'Toàn công ty' 
      };
    });
  }, [financialTargets, totalIncome, netProfit, departmentMap, view]);
  
  const budgetUsed = useMemo(() => (activeBudget && activeBudget.total_expense_budget > 0 ? (totalExpense / activeBudget.total_expense_budget) * 100 : 0), [totalExpense, activeBudget]);
  const pendingCount = useMemo(() => transactions ? timeFilteredTransactions.filter(t => t && t.status === 'pending').length : 0, [timeFilteredTransactions]);

  // Tính toán Balance Sheet
  const balanceSheet = useMemo(() => {
    const assets = accounts.filter(acc => acc.type === 'asset');
    const liabilities = accounts.filter(acc => acc.type === 'liability');
    const equity = accounts.filter(acc => acc.type === 'equity');

    // Logic tính toán số dư cho từng tài khoản (tạm thời để là 0)
    const totalAssets = 0;
    const totalLiabilities = 0;
    const totalEquity = 0;

    return { totalAssets, totalLiabilities, totalEquity };
  }, [accounts, transactions]);

  // Handlers
  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const formData = new FormData(e.currentTarget);
      const categoryId = formData.get("category") as string;
      
      // Find selected category to determine transaction type
      const selectedCategory = flattenCategories(budgetCategories).find(cat => cat.id === categoryId);
      if (!selectedCategory) {
        throw new Error("Vui lòng chọn danh mục");
      }
      
      // Determine transaction type based on category_type: 1 = expense, 2 = income
      const transactionType = selectedCategory.category_type === 2 ? "income" : "expense";
      
      console.log('🔄 Creating transaction:', {
        categoryId,
        selectedCategory: selectedCategory.name,
        categoryType: selectedCategory.category_type,
        transactionType
      });
      
      const newTransactionData = {
        transaction_type: transactionType, // Fixed: use transaction_type instead of type
        category_id: categoryId,
        description: formData.get("description") as string,
        amount: Number(formData.get("amount")),
        date: formData.get("date") as string,
        account_type: formData.get("accountType") as "company" | "cash",
        notes: (formData.get("notes") as string) || undefined,
      };
      const result = await financialsService.createTransaction(newTransactionData);
      if (result.data) {
        fetchData();
        setIsAddDialogOpen(false);
        setSelectedCategoryForTransaction(''); // Reset form
        toast({ 
          title: "Thành công", 
          description: `Đã thêm ${transactionType === 'income' ? 'thu nhập' : 'chi phí'} cho danh mục "${selectedCategory?.name}"` 
        });
      } else throw new Error(result.error || "Không thể tạo giao dịch.");
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
        toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isCreatingBudget) return;
    
    try {
      setIsCreatingBudget(true);
      const formData = new FormData(e.currentTarget);
      
      // Get selected category info
      let selectedCategory = null;
      try {
        const flattenedCategories = flattenCategories(budgetCategories);
        selectedCategory = flattenedCategories.find(cat => cat.id === selectedCategoryForBudget);
        console.log('🔍 Selected category for budget:', { selectedCategoryForBudget, selectedCategory });
      } catch (error) {
        console.error('❌ Error getting selected category:', error);
      }
      
      const budgetData = {
        name: formData.get("name") as string,
        category_id: selectedCategoryForBudget || null,
        category_name: selectedCategory?.name || '',
        period_type: formData.get("period_type") as "month" | "quarter",
        year: Number(formData.get("year")),
        period_value: Number(formData.get("period_value")),
        allocated_amount: Number(formData.get("allocated_amount")) || 0,
        description: formData.get("description") as string || '',
      };
      const result = await budgetService.createBudget({ budgetData, allocationsData: [] });
      console.log('Budget creation result:', result); // Debug log
      console.log('Result status:', result.status); // Debug log
      console.log('Result error:', result.error); // Debug log
      if (result.data) {
        fetchData();
        setIsCreateBudgetDialogOpen(false);
        toast({ 
          title: "Thành công", 
          description: `Dự toán "${budgetName}" cho danh mục "${selectedCategory?.name}" đã được tạo thành công!` 
        });
      } else {
        // Nếu lỗi 409 (trùng), lấy id ngân sách cũ và hỏi xác nhận ghi đè
        if (result.status === 409 || (result.error && (result.error.includes('409') || result.error.includes('Budget already exists')))) {
          // Gọi API lấy ngân sách cũ theo kỳ/năm/loại kỳ
          const oldRes = await budgetService.getBudgets(
            budgetData.year,
            budgetData.period_type === 'month' ? budgetData.period_value : undefined,
            budgetData.period_type === 'quarter' ? budgetData.period_value : undefined
          );
          console.log('Old budget response:', oldRes); // Debug log
          let oldBudget = oldRes.data as any;
          if (oldBudget && typeof oldBudget === 'object' && 'id' in oldBudget) {
            setConflictBudgetId(oldBudget.id as string);
            setPendingBudgetData(budgetData);
            setShowOverwriteDialog(true);
          } else {
            toast({ title: "Lỗi", description: "Đã có ngân sách cho kỳ này nhưng không thể lấy thông tin để ghi đè.", variant: "destructive" });
          }
        } else {
          throw new Error(result.error || "Không thể tạo ngân sách.");
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setIsCreatingBudget(false);
    }
  };

  const handleOverwriteBudget = async () => {
    if (!conflictBudgetId || !pendingBudgetData) return;
    setOverwriteLoading(true);
    try {
      const result = await budgetService.updateBudget(conflictBudgetId, { budgetData: pendingBudgetData, allocationsData: [] });
      if (result.data) {
        fetchData();
        setShowOverwriteDialog(false);
        setIsCreateBudgetDialogOpen(false);
        setPendingBudgetData(null);
        setConflictBudgetId(null);
        toast({ title: "Thành công", description: "Đã ghi đè ngân sách." });
      } else {
        throw new Error(result.error || "Không thể ghi đè ngân sách.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setOverwriteLoading(false);
    }
  };

  const handleOpenEditBudgetDialog = (budget: any) => {
    setEditingBudget(budget);
    setIsEditBudgetDialogOpen(true);
  };

  const handleUpdateBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBudget) return;

    const formData = new FormData(e.currentTarget);
    const updatedBudgetData = {
        name: formData.get("name") as string,
        period_type: editingBudget.period_type, // Giữ nguyên giá trị không đổi
        year: editingBudget.year,
        period_value: editingBudget.period_value,
        revenue_target: Number(formData.get("revenue_target")),
        total_expense_budget: Number(formData.get("total_expense_budget")),
    };
    
    try {
        const result = await budgetService.updateBudget(editingBudget.id, { budgetData: updatedBudgetData, allocationsData: [] });
        if (result.data) {
            fetchData();
            setIsEditBudgetDialogOpen(false);
            setEditingBudget(null);
            toast({ title: "Thành công", description: "Đã cập nhật ngân sách." });
        } else {
            throw new Error(result.error || "Không thể cập nhật ngân sách.");
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
        toast({ title: "Lỗi", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteBudget = async () => {
      if (!activeBudget) return;
      try {
          const result = await budgetService.deleteBudget(activeBudget.id);
          if (result.data) {
              fetchData();
              toast({ title: "Thành công", description: "Đã xóa ngân sách." });
          } else {
               throw new Error(result.error || "Không thể xóa ngân sách.");
          }
      } catch (error) {
          const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
          toast({ title: "Lỗi", description: msg, variant: "destructive" });
      }
  };

  const handleCreateTarget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isCreatingTarget) return;
    
    try {
      setIsCreatingTarget(true);
      const formData = new FormData(e.currentTarget);
      const targetData = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        target_type: formData.get("target_type") as "revenue" | "profit",
        period_type: formData.get("period_type") as "month" | "quarter" | "year",
        year: Number(formData.get("year")),
        period_value: Number(formData.get("period_value")),
        target_amount: Number(formData.get("target_amount")),
        assigned_to_type: 'company', // Simplified for now
      };

      const result = await financialTargetService.createTarget(targetData);
      if (result.data) {
        fetchData(); // Refetch all data
        setIsCreateTargetDialogOpen(false);
        toast({ title: "Thành công", description: "Đã tạo mục tiêu mới." });
      } else {
        throw new Error(result.error || "Không thể tạo mục tiêu.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setIsCreatingTarget(false);
    }
  };

  const handleOpenEditTargetDialog = (target: any) => {
    setEditingTarget(target);
    setIsEditTargetDialogOpen(true);
  };

  const handleUpdateTarget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTarget) return;

    // Prevent duplicate submissions
    if (isUpdatingTarget) return;
    
    try {
      setIsUpdatingTarget(true);
      const formData = new FormData(e.currentTarget);
      const updatedTargetData = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        target_amount: Number(formData.get("target_amount")),
      };
      
      const result = await financialTargetService.updateTarget(editingTarget.id, updatedTargetData);
      if (result.data) {
          fetchData();
          setIsEditTargetDialogOpen(false);
          setEditingTarget(null);
          toast({ title: "Thành công", description: "Đã cập nhật mục tiêu." });
      } else {
          throw new Error(result.error || "Không thể cập nhật mục tiêu.");
      }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
        toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleViewTransaction = (transaction: FinancialTransaction) => {
    setSelectedTransaction(transaction);
    setIsDetailDialogOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    // Prevent duplicate submissions
    if (isDeletingTransaction === id) return;
    
    try {
      setIsDeletingTransaction(id);
      const result = await financialsService.deleteTransaction(id);
      if (result.data) {
        toast({
          title: "Thành công",
          description: "Đã xóa giao dịch.",
        });
        fetchData(); // Tải lại dữ liệu
      } else {
        throw new Error(result.error || "Không thể xóa giao dịch.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setIsDeletingTransaction(null);
    }
  };

  const handleUpdateTransactionStatus = async (id: string, status: 'approved' | 'rejected') => {
    // Prevent duplicate submissions
    if (isUpdatingTransactionStatus === id) return;
    
    try {
      setIsUpdatingTransactionStatus(id);
      const result = await financialsService.updateTransactionStatus(id, status);
      if (result.data) {
        toast({
          title: "Thành công",
          description: `Đã ${status === 'approved' ? 'phê duyệt' : 'từ chối'} giao dịch.`,
        });
        fetchData(); // Tải lại dữ liệu để cập nhật UI
      } else {
        throw new Error(result.error || "Không thể cập nhật trạng thái giao dịch.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setIsUpdatingTransactionStatus(null);
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
      try {
          const result = await financialTargetService.deleteTarget(targetId);
          if (result.data) {
              fetchData();
              toast({ title: "Thành công", description: "Đã xóa mục tiêu." });
          } else {
               throw new Error(result.error || "Không thể xóa mục tiêu.");
          }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
        toast({ title: "Lỗi", description: msg, variant: "destructive" });
    }
  };

  // Di chuyển các hàm helper vào bên trong component
  const getProgressColor = (percentage: number) => {
    if (percentage <= 25) return "bg-red-500"
    if (percentage <= 50) return "bg-orange-500"
    if (percentage <= 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getProgressBgColor = (percentage: number) => {
    if (percentage <= 25) return "bg-red-100"
    if (percentage <= 50) return "bg-orange-100"
    if (percentage <= 75) return "bg-yellow-100"
    return "bg-green-100"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-500">Đã duyệt</Badge>
      case "pending":
        return <Badge variant="secondary">Chờ duyệt</Badge>
      case "rejected":
        return <Badge variant="destructive">Từ chối</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    return type === "income" ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />
  }

  const getAccountIcon = (accountType: string) => {
    return accountType === "company" ? <Building2 className="h-4 w-4 text-blue-500" /> : <Wallet className="h-4 w-4 text-orange-500" />
  }

  const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  }

  // Fallback tránh NaN cho các giá trị ngân sách
  const safeNumber = (val: any) => (typeof val === 'number' && !isNaN(val) ? val : 0);
  const safePercent = (val: any) => (typeof val === 'number' && isFinite(val) && !isNaN(val) ? val : 0);

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        </div>
      </div>
    )
  }

  console.log("5. Before render - Transactions:", timeFilteredTransactions);
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Quản lý Thu-Chi</h2>
        <div className="flex items-center space-x-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button><Plus className="mr-2 h-4 w-4" /> Thêm Giao dịch</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Thêm Giao dịch mới</DialogTitle>
                    <DialogDescription>
                      Nhập thông tin giao dịch thu chi mới.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddTransaction} className="space-y-4 py-2 pb-4">
                      <div className="space-y-2">
                      <Label htmlFor="category">Danh mục *</Label>
                      <Select 
                        name="category" 
                        required 
                        value={selectedCategoryForTransaction}
                        onValueChange={setSelectedCategoryForTransaction}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Chọn danh mục thu/chi" />
                          </SelectTrigger>
                          <SelectContent>
                          {budgetCategories.length > 0 ? (
                            flattenCategories(budgetCategories).map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <span className={`${category.level > 0 ? 'text-muted-foreground' : 'font-medium'}`}>
                                  {category.displayName}
                                  <span className={`ml-2 text-xs px-1 rounded ${
                                    category.category_type === 2 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {category.category_type === 2 ? 'Thu' : 'Chi'}
                                  </span>
                                </span>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-categories" disabled>
                              Đang tải danh mục...
                            </SelectItem>
                          )}
                          </SelectContent>
                        </Select>
                      <p className="text-xs text-muted-foreground">
                        Danh mục sẽ tự động xác định đây là thu nhập hay chi phí
                      </p>
                      </div>
                      <div className="space-y-2">
                      <Label htmlFor="amount">Số tiền *</Label>
                      <Input id="amount" name="amount" type="number" required placeholder="0" step="0.01" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Mô tả</Label>
                      <Input id="description" name="description" required placeholder="Mô tả giao dịch" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Ngày giao dịch</Label>
                        <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountType">Loại tài khoản</Label>
                        <Select name="accountType" defaultValue="company">
                          <SelectTrigger id="accountType">
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="company">Tài khoản công ty</SelectItem>
                            <SelectItem value="cash">Tiền mặt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                      <Textarea id="notes" name="notes" placeholder="Ghi chú bổ sung" />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Đang lưu..." : "Lưu Giao dịch"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="flex justify-between items-center pb-4 border-b">
        <Tabs value={view.type} onValueChange={(value) => setView({ type: value as any, date: new Date() })}>
          <TabsList>
            <TabsTrigger value="month">Tháng</TabsTrigger>
            <TabsTrigger value="quarter">Quý</TabsTrigger>
            <TabsTrigger value="year">Năm</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handlePeriodChange('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold w-36 text-center">{periodTitle}</span>
          <Button variant="outline" size="icon" onClick={() => handlePeriodChange('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="budget">Dự toán - Ngân sách</TabsTrigger>
          <TabsTrigger value="targets">Mục tiêu tài chính</TabsTrigger>
          <TabsTrigger value="transactions">Danh sách giao dịch</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo tài chính</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cảnh báo và thông báo quan trọng */}
          <div className="grid gap-4 md:grid-cols-2">
                {activeBudget && activeBudget.total_expense_budget > 0 && totalExpense > (activeBudget.total_expense_budget * 0.8) && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">Cảnh báo ngân sách</AlertTitle>
                    <AlertDescription className="text-orange-700">Đã sử dụng {safePercent(budgetUsed).toFixed(1)}% ngân sách. Cần kiểm soát chi tiêu.</AlertDescription>
              </Alert>
            )}
            {pendingCount > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Giao dịch chờ duyệt</AlertTitle>
                    <AlertDescription className="text-blue-700">Có {pendingCount} giao dịch đang chờ duyệt.</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Thống kê tổng quan chính */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng thu nhập</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(safeNumber(totalIncome))}</div>
                <p className="text-xs text-muted-foreground">trong kỳ đã chọn</p> 
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng chi phí</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(safeNumber(totalExpense))}</div>
                <p className="text-xs text-muted-foreground">trong kỳ đã chọn</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lợi nhuận ròng</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${safeNumber(netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(safeNumber(netProfit))}</div>
                <p className="text-xs text-muted-foreground">{safeNumber(netProfit) >= 0 ? 'Tăng trưởng dương' : 'Hoạt động dưới kỳ vọng'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Giao dịch chờ duyệt</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">cần được xử lý</p>
              </CardContent>
            </Card>
          </div>

          {/* Biểu đồ và phân tích */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
                  <CardHeader><CardTitle>Cơ cấu Thu nhập</CardTitle></CardHeader>
                  <CardContent>
                    {incomeByCategory.length > 0 ? (
                      <div className="space-y-4">
                        {incomeByCategory.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-medium">{formatCurrency(safeNumber(item.amount))}</p>
                              <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Không có dữ liệu thu nhập.</p>
                    )}
                  </CardContent>
            </Card>
            <Card>
                  <CardHeader><CardTitle>Cơ cấu Chi phí</CardTitle></CardHeader>
                  <CardContent>
                    {expenseByCategory.length > 0 ? (
                      <div className="space-y-4">
                        {expenseByCategory.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-medium">{formatCurrency(safeNumber(item.amount))}</p>
                              <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Không có dữ liệu chi phí.</p>
                    )}
                  </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Dự toán - Ngân sách Chi tiết</h3>
              <p className="text-sm text-muted-foreground">Quản lý ngân sách theo danh mục kế toán và tích hợp với hệ thống xin cấp chi phí</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowBudgetCategoryManager(!showBudgetCategoryManager)}>
                <Building2 className="mr-2 h-4 w-4" />
                Quản lý danh mục
              </Button>
            <Dialog open={isCreateBudgetDialogOpen} onOpenChange={setIsCreateBudgetDialogOpen}>
              <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Tạo dự toán cho danh mục</Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Tạo Dự toán cho Danh mục</DialogTitle>
                  <DialogDescription>
                      Thiết lập dự toán chi tiết cho một danh mục ngân sách cụ thể trong kỳ tài chính.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBudget} className="space-y-4 py-2 pb-4">
                    {/* Chọn danh mục */}
                  <div className="space-y-2">
                      <Label htmlFor="category">Danh mục Ngân sách *</Label>
                      <Select 
                        value={selectedCategoryForBudget} 
                        onValueChange={setSelectedCategoryForBudget}
                        required
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Chọn danh mục để tạo dự toán" />
                        </SelectTrigger>
                        <SelectContent>
                          {budgetCategories.length > 0 ? (
                            flattenCategories(budgetCategories).map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <span className={`${category.level > 0 ? 'text-muted-foreground' : 'font-medium'}`}>
                                  {category.displayName}
                                </span>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-categories" disabled>
                              Đang tải danh mục...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Chọn danh mục bạn muốn tạo dự toán. Có thể chọn danh mục cha hoặc danh mục con.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Tên Dự toán *</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        required 
                        placeholder="VD: Dự toán Marketing Tháng 8/2024" 
                        value={budgetName}
                        onChange={(e) => setBudgetName(e.target.value)} 
                      />
                      <p className="text-xs text-muted-foreground">
                        Tên sẽ tự động tạo khi chọn danh mục, bạn có thể chỉnh sửa
                      </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="period_type">Loại kỳ</Label>
                      <Select name="period_type" defaultValue="month">
                        <SelectTrigger id="period_type">
                          <SelectValue placeholder="Chọn loại kỳ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Tháng</SelectItem>
                          <SelectItem value="quarter">Quý</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period_value">Kỳ</Label>
                      <Input id="period_value" name="period_value" type="number" required placeholder="VD: 8" defaultValue={new Date().getMonth() + 1} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Năm</Label>
                      <Input id="year" name="year" type="number" required defaultValue={new Date().getFullYear()} />
                    </div>
                  </div>
                      <div className="space-y-2">
                      <Label htmlFor="allocated_amount">Số tiền dự toán *</Label>
                      <Input 
                        id="allocated_amount" 
                        name="allocated_amount" 
                        type="number" 
                        required 
                        placeholder="0" 
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground">
                        Nhập số tiền dự toán cho danh mục này trong kỳ đã chọn
                      </p>
                      </div>

                      <div className="space-y-2">
                      <Label htmlFor="description">Mô tả (tùy chọn)</Label>
                      <Input 
                        id="description" 
                        name="description" 
                        placeholder="VD: Dự toán cho các hoạt động marketing online..." 
                      />
                      </div>
                    <div className="flex flex-col items-end pt-2 space-y-2">
                      {!selectedCategoryForBudget && (
                        <p className="text-sm text-red-600">
                          Vui lòng chọn danh mục để tạo dự toán
                        </p>
                      )}
                      <Button 
                        type="submit" 
                        disabled={isCreatingBudget || !selectedCategoryForBudget}
                      >
                        {isCreatingBudget ? "Đang tạo..." : "Tạo Dự toán"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Budget Category Manager */}
          {showBudgetCategoryManager && (
            <BudgetCategoryManager
              mode="manage"
              onCategorySelect={setSelectedBudgetCategory}
              selectedCategoryId={selectedBudgetCategory?.id}
            />
          )}

              {activeBudget ? (
                <>
              {/* Basic Budget Info */}
                <Card>
                  <CardHeader>
                      <div className="flex justify-between items-start">
                          <div>
                              <CardTitle>{activeBudget.name}</CardTitle>
                              <CardDescription>
                                  Kỳ: {activeBudget.period_type === 'month' ? `Tháng ${activeBudget.period_value}` : `Quý ${activeBudget.period_value}`} / {activeBudget.year}
                              </CardDescription>
                          </div>
                           <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditBudgetDialog(activeBudget)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn ngân sách "{activeBudget?.name}" khỏi cơ sở dữ liệu.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleDeleteBudget} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </div>
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-4">
                          <div className="p-4 border rounded-lg">
                              <h4 className="text-sm font-medium text-muted-foreground">Mục tiêu Doanh thu</h4>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(safeNumber(activeBudget.revenue_target))}</p>
                          </div>
                          <div className="p-4 border rounded-lg">
                              <h4 className="text-sm font-medium text-muted-foreground">Hạn mức Chi phí</h4>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(safeNumber(activeBudget.total_expense_budget))}</p>
                          </div>
                           <div className="p-4 border rounded-lg">
                              <h4 className="text-sm font-medium text-muted-foreground">Chi phí Thực tế</h4>
                              <p className="text-2xl font-bold text-red-600">{formatCurrency(safeNumber(totalExpense))}</p>
                          </div>
                        <div className="p-4 border rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Chi phí từ Expenses</h4>
                            <p className="text-2xl font-bold text-orange-600">
                              {formatCurrency(expenseRequests.reduce((sum, exp) => sum + exp.amount, 0))}
                            </p>
                            <p className="text-xs text-muted-foreground">{expenseRequests.length} yêu cầu đã duyệt</p>
                        </div>
                      </div>

                      <div>
                          <div className="flex justify-between mb-1">
                              <span className="text-base font-medium text-blue-700">Tiến độ sử dụng Ngân sách</span>
                              <span className="text-sm font-medium text-blue-700">{safePercent(budgetUsed).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className={cn("h-2.5 rounded-full", getProgressColor(safePercent(budgetUsed)))} style={{ width: `${safePercent(budgetUsed) > 100 ? 100 : safePercent(budgetUsed)}%` }}></div>
                          </div>
                           <p className="text-sm text-muted-foreground mt-2">
                               {safePercent(budgetUsed) > 100 
                                ? <span className="text-red-600 font-semibold">Vượt ngân sách {formatCurrency(safeNumber(totalExpense) - safeNumber(activeBudget?.total_expense_budget))}</span>
                                : `Còn lại ${formatCurrency(safeNumber(activeBudget?.total_expense_budget) - safeNumber(totalExpense))} để chi tiêu.`
                               }
                          </p>
                      </div>
                  </CardContent>
                </Card>

              {/* Detailed Budget Allocations */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ Ngân sách theo Danh mục</CardTitle>
                  <CardDescription>
                    Chi tiết phân bổ và theo dõi chi phí theo từng danh mục kế toán
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BudgetCategoryManager
                    budgetId={activeBudget.id}
                    mode="allocate"
                    onCategorySelect={setSelectedBudgetCategory}
                    selectedCategoryId={selectedBudgetCategory?.id}
                  />
                </CardContent>
              </Card>

              {/* Integration with Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Receipt className="w-5 h-5" />
                    <span>Tích hợp với Xin cấp Chi phí</span>
                  </CardTitle>
                  <CardDescription>
                    Các yêu cầu chi phí đã được duyệt trong kỳ hiện tại
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expenseRequests.length > 0 ? (
                    <div className="space-y-2">
                      {expenseRequests.slice(0, 5).map((expense: any) => (
                        <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Receipt className="w-4 h-4 text-green-500" />
                            <div>
                              <div className="font-medium">{expense.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {expense.category} • {new Date(expense.date).toLocaleDateString('vi-VN')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600">{formatCurrency(expense.amount)}</div>
                            <div className="text-xs text-muted-foreground">
                              {expense.employee?.name}
                            </div>
                          </div>
                        </div>
                      ))}
                      {expenseRequests.length > 5 && (
                        <div className="text-center py-2">
                          <Link href="/expenses">
                            <Button variant="outline" size="sm">
                              Xem thêm {expenseRequests.length - 5} yêu cầu
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Chưa có yêu cầu chi phí nào được duyệt trong kỳ này
                    </div>
                  )}
                </CardContent>
              </Card>

                 {editingBudget && (
                  <Dialog open={isEditBudgetDialogOpen} onOpenChange={setIsEditBudgetDialogOpen}>
                    <DialogContent className="sm:max-w-[525px]">
                      <DialogHeader>
                        <DialogTitle>Chỉnh sửa Ngân sách</DialogTitle>
                        <DialogDescription>
                          Cập nhật thông tin cho ngân sách "{editingBudget.name}".
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdateBudget} className="space-y-4 py-2 pb-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Tên Ngân sách</Label>
                          <Input id="name" name="name" required defaultValue={editingBudget.name} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Loại kỳ</Label>
                            <Input disabled value={editingBudget.period_type === 'month' ? 'Tháng' : 'Quý'} />
                          </div>
                          <div className="space-y-2">
                            <Label>Kỳ</Label>
                            <Input type="number" disabled value={editingBudget.period_value} />
                          </div>
                          <div className="space-y-2">
                            <Label>Năm</Label>
                            <Input type="number" disabled value={editingBudget.year} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="revenue_target">Mục tiêu Doanh thu</Label>
                                <Input id="revenue_target" name="revenue_target" type="number" required defaultValue={editingBudget.revenue_target} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="total_expense_budget">Hạn mức Chi phí</Label>
                                <Input id="total_expense_budget" name="total_expense_budget" type="number" required defaultValue={editingBudget.total_expense_budget} />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button type="submit" disabled={isUpdatingTarget}>
                            {isUpdatingTarget ? "Đang cập nhật..." : "Cập nhật Ngân sách"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
                </>
              ) : (
                <Alert variant="default" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Không tìm thấy ngân sách</AlertTitle>
                  <AlertDescription>Chưa có ngân sách nào được thiết lập cho kỳ này. Hãy tạo một dự toán mới để bắt đầu theo dõi.</AlertDescription>
                </Alert>
              )}
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Mục tiêu Tài chính</h3>
              <p className="text-sm text-muted-foreground">Thiết lập và theo dõi các mục tiêu tài chính</p>
            </div>
                <Dialog open={isCreateTargetDialogOpen} onOpenChange={setIsCreateTargetDialogOpen}>
                  <DialogTrigger asChild>
                      <Button><Plus className="mr-2 h-4 w-4" /> Thêm mục tiêu</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Tạo Mục tiêu Tài chính mới</DialogTitle>
                      <DialogDescription>
                        Thiết lập một mục tiêu tài chính cụ thể để theo dõi.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTarget} className="space-y-4 py-2 pb-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Tên Mục tiêu</Label>
                        <Input id="name" name="name" required placeholder="VD: Tăng doanh thu Quý 3" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Mô tả</Label>
                        <Textarea id="description" name="description" placeholder="Mô tả chi tiết về mục tiêu này" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="target_type">Loại mục tiêu</Label>
                          <Select name="target_type" defaultValue="revenue">
                            <SelectTrigger id="target_type"><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="revenue">Doanh thu</SelectItem>
                              <SelectItem value="profit">Lợi nhuận</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target_amount">Số tiền mục tiêu</Label>
                            <Input id="target_amount" name="target_amount" type="number" required placeholder="0" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="period_type">Loại kỳ</Label>
                          <Select name="period_type" defaultValue="month">
                            <SelectTrigger id="period_type"><SelectValue placeholder="Chọn loại kỳ" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="month">Tháng</SelectItem>
                              <SelectItem value="quarter">Quý</SelectItem>
                              <SelectItem value="year">Năm</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="period_value">Kỳ</Label>
                          <Input id="period_value" name="period_value" type="number" required placeholder="VD: 8" defaultValue={new Date().getMonth() + 1} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="year">Năm</Label>
                          <Input id="year" name="year" type="number" required defaultValue={new Date().getFullYear()} />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isCreatingTarget}>
                          {isCreatingTarget ? "Đang tạo..." : "Tạo Mục tiêu"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
          </div>

              {processedTargets.length > 0 ? (
                <div className="space-y-4">
                  {processedTargets.map(target => (
                    <Card key={target.id}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{target.name}</CardTitle>
                          <div className="flex items-center space-x-1">
                            <Badge variant={target.status === 'completed' ? 'default' : 'secondary'}>
                                {target.status === 'completed' ? 'Hoàn thành' : 'Đang tiến hành'}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditTargetDialog(target)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn mục tiêu "{target.name}".
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTarget(target.id)} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <CardDescription>{target.department_name || 'Toàn công ty'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Hiện tại: <span className="font-bold">{formatCurrency(safeNumber(target.current_amount))}</span></span>
                            <span>Mục tiêu: <span className="font-bold">{formatCurrency(safeNumber(target.target_amount))}</span></span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${Math.min((safeNumber(target.current_amount) / safeNumber(target.target_amount)) * 100, 100)}%` }}>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground text-right">
                            {((safeNumber(target.current_amount) / safeNumber(target.target_amount)) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <p>Chưa có mục tiêu tài chính nào được thiết lập.</p>
                </div>
              )}
               {editingTarget && (
                  <Dialog open={isEditTargetDialogOpen} onOpenChange={setIsEditTargetDialogOpen}>
                    <DialogContent className="sm:max-w-[525px]">
                      <DialogHeader>
                        <DialogTitle>Chỉnh sửa Mục tiêu</DialogTitle>
                        <DialogDescription>
                          Cập nhật thông tin cho mục tiêu "{editingTarget.name}".
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdateTarget} className="space-y-4 py-2 pb-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Tên Mục tiêu</Label>
                          <Input id="name" name="name" required defaultValue={editingTarget.name} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Mô tả</Label>
                          <Textarea id="description" name="description" defaultValue={editingTarget.description} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target_amount">Số tiền mục tiêu</Label>
                            <Input id="target_amount" name="target_amount" type="number" required defaultValue={editingTarget.target_amount} />
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button type="submit" disabled={isUpdatingTarget}>
                            {isUpdatingTarget ? "Đang cập nhật..." : "Cập nhật Mục tiêu"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo Kết quả Kinh doanh (Lãi & Lỗ)</CardTitle>
              <CardDescription>
                Hiển thị dòng tiền trong kỳ: {formatDate(reportStartDate)} - {formatDate(reportEndDate)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">Hạng mục</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Revenue Section */}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Tổng Doanh thu</TableCell>
                      <TableCell className="text-right">{formatCurrency(safeNumber(totalIncome))}</TableCell>
                    </TableRow>
                    {incomeByCategory.length > 0 ? incomeByCategory.map((item, index) => (
                      <TableRow key={`income-${index}`}>
                        <TableCell className="pl-8">{item.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(safeNumber(item.amount))}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={2} className="pl-8 text-muted-foreground">Không có doanh thu</TableCell>
                      </TableRow>
                    )}

                    {/* Expense Section */}
                     <TableRow className="font-bold bg-muted/50">
                      <TableCell>Tổng Chi phí</TableCell>
                      <TableCell className="text-right text-red-600">({formatCurrency(safeNumber(totalExpense))})</TableCell>
                    </TableRow>
                     {expenseByCategory.length > 0 ? expenseByCategory.map((item, index) => (
                      <TableRow key={`expense-${index}`}>
                        <TableCell className="pl-8">{item.name}</TableCell>
                        <TableCell className="text-right text-red-500">({formatCurrency(safeNumber(item.amount))})</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={2} className="pl-8 text-muted-foreground">Không có chi phí</TableCell>
                      </TableRow>
                    )}

                    {/* Separator */}
                    <TableRow>
                        <TableCell colSpan={2} className="py-2"><Separator /></TableCell>
                    </TableRow>

                    {/* Net Profit */}
                    <TableRow className="text-lg font-bold">
                      <TableCell>Lợi nhuận ròng</TableCell>
                      <TableCell className={`text-right ${safeNumber(netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(safeNumber(netProfit))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-end space-x-2">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Tải về PDF
                  </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách Giao dịch</CardTitle>
              <CardDescription>
                Hiển thị tất cả các giao dịch thu chi đã được ghi nhận trong kỳ: {periodTitle}.
              </CardDescription>
              {/* Thêm các bộ lọc ở đây nếu cần */}
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeFilteredTransactions.length > 0 ? (
                      timeFilteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                      {getTypeIcon(transaction.type)}
                              {getAccountIcon(transaction.account_type)}
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                                  {(() => {
                                    const category = categories.find(c => c.id === transaction.category_id);
                                    return category ? `${category.code} - ${category.name}` : 'N/A';
                                  })()} • {formatDate(transaction.date)}
                        </div>
                      </div>
                    </div>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(safeNumber(transaction.amount))}
                          </TableCell>
                          <TableCell>
                      {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell className="text-center">
                            {transaction.status === 'pending' ? (
                              <div className="flex items-center justify-center space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-green-600 hover:text-green-700" 
                                  onClick={() => handleUpdateTransactionStatus(transaction.id, 'approved')}
                                  disabled={isUpdatingTransactionStatus === transaction.id}
                                >
                                  {isUpdatingTransactionStatus === transaction.id ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-600 hover:text-red-700" 
                                  onClick={() => handleUpdateTransactionStatus(transaction.id, 'rejected')}
                                  disabled={isUpdatingTransactionStatus === transaction.id}
                                >
                                  {isUpdatingTransactionStatus === transaction.id ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleViewTransaction(transaction)}><Eye className="h-4 w-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      disabled={isDeletingTransaction === transaction.id}
                                    >
                                      {isDeletingTransaction === transaction.id ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Hành động này không thể được hoàn tác. Giao dịch "{transaction.description}" sẽ bị xóa vĩnh viễn.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          Không có giao dịch nào.
                        </TableCell>
                      </TableRow>
              )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={fetchData}
      >
        Thử lại
      </Button>
      {/* Dialog xác nhận ghi đè ngân sách */}
      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ngân sách đã tồn tại</AlertDialogTitle>
            <DialogDescription>
              Ngân sách cho kỳ này đã tồn tại. Bạn có muốn ghi đè bằng dữ liệu mới không?
            </DialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOverwriteDialog(false)} disabled={overwriteLoading}>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwriteBudget} disabled={overwriteLoading}>Ghi đè</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Chi tiết Giao dịch */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết Giao dịch</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết cho giao dịch #{selectedTransaction?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mô tả:</span>
                <span className="font-medium text-right">{selectedTransaction.description}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Số tiền:</span>
                <span className={`font-bold ${selectedTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedTransaction.type === 'income' ? '+' : '-'} {formatCurrency(safeNumber(selectedTransaction.amount))}
                </span>
              </div>
               <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Loại:</span>
                <Badge variant={selectedTransaction.type === 'income' ? 'default' : 'secondary'}>
                  {selectedTransaction.type === 'income' ? 'Thu nhập' : 'Chi phí'}
                </Badge>
              </div>
               <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Danh mục:</span>
                <span className="font-medium">{categoryMap.get(selectedTransaction.category_id) || 'N/A'}</span>
              </div>
               <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ngày:</span>
                <span className="font-medium">{formatDate(selectedTransaction.date)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trạng thái:</span>
                {getStatusBadge(selectedTransaction.status)}
              </div>
               {selectedTransaction.notes && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Ghi chú:</span>
                    <p className="text-sm p-2 bg-muted rounded-md">{selectedTransaction.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDetailDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

