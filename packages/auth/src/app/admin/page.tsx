import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const session = await auth();

  // Check if user is logged in
  if (!session?.user?.email) {
    redirect("/signin?callbackUrl=/admin");
  }

  // Check if user is admin based on ADMIN_USERS env variable
  const adminUsers = process.env.ADMIN_USERS?.split(',').map(email => email.trim()) || [];
  const isAdmin = adminUsers.includes(session.user.email);

  if (!isAdmin) {
    return (
      <div className="min-h-screen auth-gradient flex items-center justify-center p-4">
        <div className="auth-card rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You don't have administrative privileges to access this page.
          </p>
          <a href="/" className="btn-secondary">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return <AdminDashboard userEmail={session.user.email} />;
} 