import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { ArrowUpRight, BookUser, GraduationCap, Inbox, Wallet } from "lucide-react"
import { api, errMsg } from "@/lib/api"
import { useAuth } from "@/store/auth"
import { PageLoader } from "@/components/ui/form"
import { Card, PageHeader, money } from "@/components/ui/kit"
import { cn } from "@/lib/utils"

type Dash = {
  cards: {
    students: { total: number; active: number; completed: number; dropped: number }
    faculty: { total: number; active: number; inactive: number }
    fees: { submitted: number; partial: number; remaining: number; totalStudents: number; expectedAmount: number; collectedAmount: number; outstandingAmount: number }
    inquiries: { new: number; total: number }
  }
  charts: {
    admissionsVsCollections: { month: string; admissions: number; collections: number }[]
    inquiriesMonthly: { month: string; value: number }[]
    studentsByCourse: { course: string; students: number }[]
    feeStatus: { name: string; value: number }[]
    inquiryStatus: { name: string; value: number }[]
  }
}

const C = { blue: "#4169E1", green: "#10b981", amber: "#f59e0b", red: "#ef4444", violet: "#8b5cf6", slate: "#94a3b8" }

function StatCard({ to, icon: Icon, title, value, sub, tone, children }: {
  to: string; icon: React.ComponentType<{ className?: string }>; title: string; value: React.ReactNode; sub?: React.ReactNode; tone: string; children?: React.ReactNode
}) {
  return (
    <Link to={to} className="group block focus-visible:outline-none">
      <Card className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
        <div className="flex items-start justify-between">
          <span className={cn("flex size-10 items-center justify-center rounded-xl text-white", tone)}><Icon className="size-5" /></span>
          <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        {children}
      </Card>
    </Link>
  )
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("p-5", className)}>
      <h3 className="text-xl font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4 h-64">{children}</div>
    </Card>
  )
}

const NoData = () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>

export default function Dashboard() {
  const can = useAuth((s) => s.can)
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: async () => (await api.get<Dash>("/dashboard")).data })

  if (isLoading) return <PageLoader />
  if (error || !data) return <p className="text-destructive">{errMsg(error)}</p>
  const { cards: c, charts } = data
  const pct = c.fees.totalStudents ? Math.round((c.fees.submitted / c.fees.totalStudents) * 100) : 0
  const feeHasData = charts.feeStatus.some((x) => x.value > 0)
  const inqHasData = charts.inquiryStatus.some((x) => x.value > 0)
  const pieColors = [C.green, C.amber, C.red]
  const inqColors = [C.blue, C.amber, C.green, C.slate]

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of students, faculty, fees and inquiries." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can("students:view") && (
          <StatCard to="/students" icon={GraduationCap} title="Students" value={c.students.total} tone="bg-blue-500"
            sub={`${c.students.active} active · ${c.students.completed} completed · ${c.students.dropped} dropped`} />
        )}
        {can("faculty:view") && (
          <StatCard to="/faculty" icon={BookUser} title="Faculty" value={c.faculty.total} tone="bg-violet-500"
            sub={`${c.faculty.active} active · ${c.faculty.inactive} inactive`} />
        )}
        {can("fees:view") && (
          <StatCard to="/fees" icon={Wallet} title="Fee Submission" value={<>{c.fees.submitted}<span className="text-base font-medium text-muted-foreground"> / {c.fees.totalStudents} paid</span></>} tone="bg-emerald-500"
            sub={<><b className="text-foreground">{c.fees.remaining}</b> students remaining · {money(c.fees.outstandingAmount)} due</>}>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{pct}% fully submitted</p>
          </StatCard>
        )}
        {can("inquiries:view") && (
          <StatCard to="/inquiries" icon={Inbox} title="New Inquiries" value={c.inquiries.new} tone="bg-amber-500" sub={`${c.inquiries.total} total received`} />
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Admissions vs Fee Collection" subtitle="Last 6 months — new students (bars) and fees collected in Rs (line)">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={charts.admissionsVsCollections}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <YAxis yAxisId="r" orientation="right" tickLine={false} axisLine={false} width={56} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip formatter={(v, n) => (n === "Fees collected" ? money(Number(v)) : v)} />
              <Legend />
              <Bar yAxisId="l" dataKey="admissions" name="Admissions" fill={C.blue} radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" dataKey="collections" name="Fees collected" stroke={C.green} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fee Status" subtitle="Students by payment status">
          {feeHasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.feeStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {charts.feeStatus.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>

        <ChartCard className="lg:col-span-2" title="Students by Course" subtitle="Top courses by enrolled students">
          {charts.studentsByCourse.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.studentsByCourse} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="course" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="students" name="Students" fill={C.violet} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>

        <ChartCard title="Inquiries" subtitle="Status breakdown">
          {inqHasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.inquiryStatus} dataKey="value" nameKey="name" outerRadius={85} paddingAngle={2}>
                  {charts.inquiryStatus.map((_, i) => <Cell key={i} fill={inqColors[i]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>

        <ChartCard className="lg:col-span-3" title="Inquiry Trend" subtitle="Inquiries received per month (last 6 months)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.inquiriesMonthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
              <Tooltip />
              <Line dataKey="value" name="Inquiries" stroke={C.amber} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
