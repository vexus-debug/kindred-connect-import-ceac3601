import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Users, CalendarDays, CreditCard, TrendingUp, UserPlus, CalendarPlus, FileText,
  Clock, Activity, ArrowUpRight, ArrowDownRight, Zap, ChevronRight, Stethoscope, CalendarCheck,
  CircleDot, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, RadialBarChart, RadialBar, Cell,
} from "recharts";
import {
  useDashboardStats, useWeeklyAppointments, useRevenueData,
  useTodaySchedule, useRecentActivity, useCurrentUserName, useTreatmentDistribution,
} from "@/hooks/useDashboardData";
import { format } from "date-fns";
import { useOrg } from "@/hooks/useOrg";
import { hasPageAccess } from "@/config/roleAccess";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/* ─── Colour maps ────────────────────────────────────────────── */
const statusColors: Record<string, string> = {
  scheduled:    "bg-primary/10 text-primary border-primary/20",
  "in-progress": "bg-amber-500/10 text-amber-700 border-amber-500/20",
  completed:    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled:    "bg-red-500/10 text-red-700 border-red-500/20",
};
const statusDots: Record<string, string> = {
  scheduled:    "bg-primary",
  "in-progress": "bg-amber-500",
  completed:    "bg-emerald-500",
  cancelled:    "bg-red-500",
};
const activityColors: Record<string, string> = {
  appointment:  "bg-primary/10 text-primary",
  payment:      "bg-emerald-500/10 text-emerald-600",
  patient:      "bg-primary/10 text-primary",
  lab:          "bg-amber-500/10 text-amber-600",
  prescription: "bg-rose-500/10 text-rose-600",
};
const activityIcons: Record<string, typeof Activity> = {
  appointment:  CalendarDays,
  payment:      CreditCard,
  patient:      Users,
  lab:          FileText,
  prescription: FileText,
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", minimumFractionDigits: 0,
  }).format(amount);
}

/* ─── Animation variants ─────────────────────────────────────── */
const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, y: 18, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as const } },
  },
};

/* ─── Tooltip style ──────────────────────────────────────────── */
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  fontSize: "12px",
  boxShadow: "0 8px 24px -4px hsl(var(--foreground) / 0.08)",
};

/* ─── Radial gauge component ────────────────────────────────── */
function RadialGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const data = [{ value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[90px] w-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} data={data} barSize={8}>
            <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground tabular-nums">{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ─── Greeting helper ────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ═══════════════════════════════════════════════════════════════
   Dashboard Home — Premium Bento Layout
═══════════════════════════════════════════════════════════════ */
export default function DashboardHome() {
  const [revPeriod, setRevPeriod] = useState<"6M" | "1Y">("6M");

  const { data: stats } = useDashboardStats();
  const { data: weeklyData } = useWeeklyAppointments();
  const { data: revenueData } = useRevenueData();
  const { data: todayAppointments } = useTodaySchedule();
  const { data: activities } = useRecentActivity();
  const { data: userName } = useCurrentUserName();
  const { data: treatmentDist, isLoading: treatmentDistLoading } = useTreatmentDistribution();
  const { currentOrg, basePath } = useOrg();
  const orgRole = currentOrg?.role || "receptionist";

  const s = stats || { totalPatients: 0, todayAppointments: 0, pendingPayments: 0, monthlyRevenue: 0 };
  const schedule = todayAppointments || [];
  const recentActivities = activities || [];

  const canSeePatients     = hasPageAccess(orgRole, "patients");
  const canSeeBilling      = hasPageAccess(orgRole, "billing");
  const canSeeAppointments = hasPageAccess(orgRole, "appointments");

  /* Quick actions */
  const quickActions = [
    canSeePatients    && { to: `${basePath}/patients`,     icon: UserPlus,    title: "Register Patient" },
    canSeeAppointments && { to: `${basePath}/appointments`, icon: CalendarPlus, title: "Book Appointment" },
    canSeeBilling     && { to: `${basePath}/billing`,      icon: FileText,    title: "Create Invoice" },
  ].filter(Boolean) as any[];

  return (
    <div className="space-y-5">

      {/* ── Row 1: Compact Welcome Strip ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-1">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-dental-teal-light flex items-center justify-center shadow-md shadow-primary/20">
                <Stethoscope className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                  {getGreeting()}, {userName || "Doctor"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(), "EEEE, MMMM d")} · {schedule.length} appointment{schedule.length !== 1 ? "s" : ""} today
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {quickActions.map((action: any) => (
              <Button key={action.to} size="sm" variant="outline" className="gap-1.5 rounded-lg text-xs border-border hover:border-primary/40 hover:bg-primary/5 transition-all" asChild>
                <Link to={action.to}>
                  <action.icon className="h-3.5 w-3.5 text-primary" />
                  {action.title}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Row 2: Bento KPI Grid ──────────────────────────────── */}
      <motion.div
        className="grid gap-3 grid-cols-2 lg:grid-cols-4"
        variants={stagger.container}
        initial="hidden"
        animate="visible"
      >
        {/* Patient count — large number card */}
        {canSeePatients && (
          <motion.div variants={stagger.item}>
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/[0.04] h-full group hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <ArrowUpRight className="h-3 w-3" /> +12%
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black tracking-tight text-foreground tabular-nums">
                    <AnimatedCounter value={s.totalPatients} />
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">Total Patients</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Today's appointments — radial gauge */}
        {canSeeAppointments && (
          <motion.div variants={stagger.item}>
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-emerald-500/[0.03] h-full group hover:shadow-lg hover:border-emerald-500/20 transition-all duration-300">
              <CardContent className="p-5 flex flex-col items-center justify-center h-full">
                <RadialGauge
                  value={schedule.filter(a => a.status === "completed").length}
                  max={Math.max(s.todayAppointments, 1)}
                  label="Completed"
                  color="hsl(var(--success))"
                />
                <div className="text-center mt-2">
                  <p className="text-2xl font-black text-foreground tabular-nums">
                    <AnimatedCounter value={s.todayAppointments} />
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Today's Appointments</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pending Payments — accent warning card */}
        {canSeeBilling && (
          <motion.div variants={stagger.item}>
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-gold/[0.04] h-full group hover:shadow-lg hover:border-gold/20 transition-all duration-300">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-gold/10 flex items-center justify-center">
                    <CreditCard className="h-4.5 w-4.5 text-gold-deep" />
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                    <ArrowDownRight className="h-3 w-3" /> -5%
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black tracking-tight text-foreground tabular-nums">
                    <AnimatedCounter value={s.pendingPayments} />
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">Pending Payments</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Monthly Revenue — hero metric */}
        {canSeeBilling && (
          <motion.div variants={stagger.item}>
            <Card className="relative overflow-hidden border-border/50 h-full group hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              {/* Gradient shimmer bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-dental-teal-light/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="relative p-5 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <ArrowUpRight className="h-3 w-3" /> +8.2%
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black tracking-tight text-foreground tabular-nums">
                    <AnimatedCounter value={s.monthlyRevenue} formatter={formatCurrency} />
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">Revenue ({format(new Date(), "MMM")})</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* ── Row 3: Revenue Chart (wide) + Treatment Breakdown (narrow) ── */}
      {(canSeeAppointments || canSeeBilling) && (
        <motion.div
          className="grid gap-4 lg:grid-cols-5"
          variants={stagger.container}
          initial="hidden"
          animate="visible"
        >
          {/* Revenue trend — sleek area */}
          {canSeeBilling && (
            <motion.div variants={stagger.item} className="lg:col-span-3">
              <Card className="border-border/50 bg-card h-full hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
                        <CardDescription className="text-[11px]">Monthly trend (₦)</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-0.5 bg-muted/60 rounded-lg p-0.5">
                      {(["6M", "1Y"] as const).map((label) => (
                        <button
                          key={label}
                          onClick={() => setRevPeriod(label)}
                          className={cn(
                            "px-3 py-1 text-[11px] font-semibold rounded-md transition-all",
                            revPeriod === label
                              ? "bg-card text-primary shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revenueData || []}>
                      <defs>
                        <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        axisLine={false} tickLine={false} width={44}
                        tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#revGrad2)" dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 5, fill: "hsl(var(--primary))" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Treatment breakdown — horizontal bars */}
          <motion.div variants={stagger.item} className="lg:col-span-2">
            <Card className="border-border/50 bg-card h-full hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gold/10 flex items-center justify-center">
                    <CircleDot className="h-4 w-4 text-gold-deep" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Treatments</CardTitle>
                    <CardDescription className="text-[11px]">Distribution by type</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3.5">
                {treatmentDistLoading ? (
                  <div className="space-y-3.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-2 w-full bg-muted rounded-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (treatmentDist || []).length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No treatment data yet</p>
                    <p className="text-[11px] text-muted-foreground">
                      Distribution appears once appointments are linked to treatments.
                    </p>
                  </div>
                ) : (treatmentDist || []).map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="font-bold text-foreground tabular-nums">{item.value}% <span className="font-medium text-muted-foreground">({item.count})</span></span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: item.fill }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* ── Row 4: Timeline Schedule + Weekly Heatmap + Activity ── */}
      <div className="grid gap-4 lg:grid-cols-12">

        {/* Today's Schedule — Timeline Cards */}
        {canSeeAppointments && (
          <Card className="lg:col-span-5 border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Today's Schedule</CardTitle>
                    <CardDescription className="text-[11px]">
                      {schedule.filter(a => a.status === "completed").length} done · {schedule.filter(a => a.status === "scheduled").length} upcoming
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary text-xs gap-1" asChild>
                  <Link to={`${basePath}/appointments`}>
                    View all <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 max-h-[380px] overflow-y-auto scroll-momentum">
              {schedule.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No appointments today</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`${basePath}/appointments`}>Book Appointment</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedule.slice(0, 8).map((apt, i) => {
                    const initials = apt.patientName.split(" ").map((n: string) => n[0]).join("").slice(0, 2);
                    return (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50 transition-all group"
                      >
                        {/* Time pill */}
                        <div className="flex flex-col items-center justify-center bg-card border border-border/60 rounded-lg px-2 py-1.5 min-w-[52px] shadow-sm">
                          <span className="text-xs font-bold text-foreground tabular-nums leading-none">{apt.time}</span>
                        </div>
                        {/* Patient info */}
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{apt.patientName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{apt.treatment} · {apt.dentist}</p>
                        </div>
                        {/* Status dot */}
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                          statusColors[apt.status] || ""
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", statusDots[apt.status] || "")} />
                          {apt.status.replace("-", " ")}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Weekly Appointments — Vertical bars with day labels */}
        {canSeeAppointments && (
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border/50 bg-card h-full hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CalendarCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">This Week</CardTitle>
                      <CardDescription className="text-[11px]">Appointment volume</CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary text-xs gap-1" asChild>
                    <Link to={`${basePath}/appointments`}>
                      Calendar <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyData || []} barCategoryGap="24%">
                    <defs>
                      <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--dental-teal-light))" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="url(#barGrad2)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Activity Feed — Compact Timeline */}
        <Card className="lg:col-span-3 border-border/50 bg-card hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Activity</CardTitle>
                <CardDescription className="text-[11px]">Latest updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 max-h-[340px] overflow-y-auto scroll-momentum">
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentActivities.map((activity) => {
                  const Icon = activityIcons[activity.event_type] || Activity;
                  const colorClass = activityColors[activity.event_type] || "bg-muted text-muted-foreground";
                  return (
                    <div key={activity.id} className="timeline-item flex gap-3 pb-3.5">
                      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ring-2 ring-card", colorClass)}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium leading-snug">{activity.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(activity.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
