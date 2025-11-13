import { AuthGuard } from "@/components/auth-guard";
import LeaveRequestsPage from "../leave-requests/page";

export default function ManageLeaveRequestsRoute() {
  return (
    <AuthGuard allowedDbRoles={["admin","hr"]} redirectTo="/my-leave-requests">
      <LeaveRequestsPage />
    </AuthGuard>
  )
}
