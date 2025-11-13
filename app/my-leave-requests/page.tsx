import { AuthGuard } from "@/components/auth-guard";
import LeaveRequestsPage from "../leave-requests/page";

export default function MyLeaveRequestsRoute() {
  return (
    <AuthGuard>
      <LeaveRequestsPage />
    </AuthGuard>
  )
}
