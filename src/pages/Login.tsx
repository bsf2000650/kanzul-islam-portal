import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { errMsg } from "@/lib/api"
import { isEmail, required, useFormErrors } from "@/lib/validation"
import { useAuth } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { FormField, Input, PasswordInput, Spinner } from "@/components/ui/form"

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  // Sign-in only checks that the fields are filled in; the password policy applies when a password is created.
  const v = useFormErrors({ email, password }, (f) => ({
    email: required(f.email, "Email") ?? (isEmail(f.email) ? undefined : "Enter a valid email address"),
    password: required(f.password, "Password"),
  }))

  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!v.check()) return
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate("/", { replace: true })
    } catch (err) {
      toast.error(errMsg(err, "Login failed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <form noValidate onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border bg-background p-7 shadow-lg">
        <div className="text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary text-2xl font-black text-primary-foreground">K</span>
          <h1 className="text-xl font-semibold">Kanzul Islam Admin Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your website</p>
        </div>
        <FormField label="Email" error={v.err("email")}>
          <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} {...v.props("email")} />
        </FormField>
        <FormField label="Password" error={v.err("password")}>
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} {...v.props("password")} />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy && <Spinner />} Sign in</Button>
      </form>
    </div>
  )
}
