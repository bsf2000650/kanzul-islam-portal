import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "@/store/auth"
import { PageLoader } from "@/components/ui/form"
import { AdminLayout } from "@/components/layout/AdminLayout"
import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import PageEditorRoute from "@/pages/PageEditor"
import Students from "@/pages/Students"
import Faculty from "@/pages/Faculty"
import Fees from "@/pages/Fees"
import Users from "@/pages/Users"
import Roles from "@/pages/Roles"
import Inquiries from "@/pages/Inquiries"

function Protected() {
  const { user, ready } = useAuth()
  if (!ready) return <div className="flex min-h-svh items-center justify-center"><PageLoader /></div>
  return user ? <AdminLayout /> : <Navigate to="/login" replace />
}

function Guard({ perm, children }: { perm: string; children: React.ReactNode }) {
  const can = useAuth((s) => s.can)
  return can(perm) ? <>{children}</> : (
    <div className="py-20 text-center">
      <h2 className="text-lg font-semibold">Access denied</h2>
      <p className="mt-1 text-sm text-muted-foreground">Your role does not allow you to open this page.</p>
    </div>
  )
}

/** Send the user to the first screen their role can open. */
function Home() {
  const can = useAuth((s) => s.can)
  if (can("dashboard:view")) return <Dashboard />
  const first = [["pages:view", "/pages"], ["students:view", "/students"], ["faculty:view", "/faculty"], ["fees:view", "/fees"], ["users:view", "/users"], ["roles:view", "/roles"], ["inquiries:view", "/inquiries"]]
    .find(([p]) => can(p))
  return first ? <Navigate to={first[1]} replace /> : <Guard perm="dashboard:view"><Dashboard /></Guard>
}

export default function App() {
  const init = useAuth((s) => s.init)
  useEffect(() => { void init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route index element={<Home />} />
          <Route path="pages" element={<Navigate to="/pages/common" replace />} />
          <Route path="pages/:key" element={<Guard perm="pages:view"><PageEditorRoute /></Guard>} />
          <Route path="students" element={<Guard perm="students:view"><Students /></Guard>} />
          <Route path="faculty" element={<Guard perm="faculty:view"><Faculty /></Guard>} />
          <Route path="fees" element={<Guard perm="fees:view"><Fees /></Guard>} />
          <Route path="users" element={<Guard perm="users:view"><Users /></Guard>} />
          <Route path="roles" element={<Guard perm="roles:view"><Roles /></Guard>} />
          <Route path="inquiries" element={<Guard perm="inquiries:view"><Inquiries /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
