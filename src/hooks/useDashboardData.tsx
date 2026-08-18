import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";

export function useDashboardStats() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;

  return useQuery({
    queryKey: ["dashboard-stats", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      const [patientsRes, appointmentsRes, pendingInvoicesRes, paymentsRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("org_id", orgId!),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("appointment_date", today),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("org_id", orgId!).eq("status", "pending"),
        supabase.from("payments").select("amount").eq("org_id", orgId!).gte("payment_date", monthStart).lte("payment_date", monthEnd),
      ]);

      const monthlyRevenue = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        totalPatients: patientsRes.count || 0,
        todayAppointments: appointmentsRes.count || 0,
        pendingPayments: pendingInvoicesRes.count || 0,
        monthlyRevenue,
      };
    },
  });
}

export function useWeeklyAppointments() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;

  return useQuery({
    queryKey: ["weekly-appointments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

      const { data } = await supabase
        .from("appointments")
        .select("appointment_date")
        .eq("org_id", orgId!)
        .gte("appointment_date", weekStart)
        .lte("appointment_date", weekEnd);

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const counts: Record<string, number> = {};
      days.forEach((d) => (counts[d] = 0));
      (data || []).forEach((a) => {
        const dayIndex = new Date(a.appointment_date).getDay();
        const idx = dayIndex === 0 ? 6 : dayIndex - 1;
        counts[days[idx]]++;
      });
      return days.map((day) => ({ day, count: counts[day] }));
    },
  });
}

export function useRevenueData() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;

  return useQuery({
    queryKey: ["revenue-data", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const now = new Date();
      const months: { month: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        months.push({
          month: format(d, "MMM"),
          start: format(startOfMonth(d), "yyyy-MM-dd"),
          end: format(endOfMonth(d), "yyyy-MM-dd"),
        });
      }

      const { data } = await supabase
        .from("payments")
        .select("amount, payment_date")
        .eq("org_id", orgId!)
        .gte("payment_date", months[0].start)
        .lte("payment_date", months[months.length - 1].end);

      return months.map((m) => ({
        month: m.month,
        revenue: (data || [])
          .filter((p) => p.payment_date >= m.start && p.payment_date <= m.end)
          .reduce((sum, p) => sum + Number(p.amount), 0),
      }));
    },
  });
}

export function useTodaySchedule() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;

  return useQuery({
    queryKey: ["today-schedule", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");

      const { data } = await supabase
        .from("appointments")
        .select("id, appointment_time, status, chair, notes, patients(first_name, last_name), staff(full_name), treatments(name)")
        .eq("org_id", orgId!)
        .eq("appointment_date", today)
        .order("appointment_time");

      return (data || []).map((a: any) => ({
        id: a.id,
        time: a.appointment_time?.slice(0, 5) || "",
        patientName: `${a.patients?.first_name || ""} ${a.patients?.last_name || ""}`.trim() || "Unknown",
        dentist: a.staff?.full_name || "Unassigned",
        chair: a.chair || "-",
        treatment: a.treatments?.name || a.notes || "-",
        status: a.status || "scheduled",
      }));
    },
  });
}

export function useRecentActivity() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;

  return useQuery({
    queryKey: ["recent-activity", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("id, event_type, description, created_at")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(10);

      return data || [];
    },
  });
}

export function useCurrentUserName() {
  const { profile, user } = useAuth();

  return useQuery({
    queryKey: ["current-user-name", profile?.full_name, user?.email],
    queryFn: async () => {
      if (profile?.full_name) return profile.full_name;
      if (user?.email) {
        // Extract name from email (e.g. "john.doe@..." -> "John Doe")
        const local = user.email.split("@")[0];
        return local
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
      return "Doctor";
    },
    enabled: true,
  });
}

const DIST_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--dental-teal-light))",
  "hsl(var(--gold))",
  "hsl(var(--slate))",
  "hsl(var(--info))",
];

/** Real treatment distribution over the last 90 days of appointments. */
export function useTreatmentDistribution() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;

  return useQuery({
    queryKey: ["treatment-distribution", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const since = format(subMonths(new Date(), 3), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("appointments")
        .select("treatment_id, treatments(name)")
        .eq("org_id", orgId!)
        .gte("appointment_date", since)
        .not("treatment_id", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      let total = 0;
      (data || []).forEach((row: any) => {
        const name = row.treatments?.name;
        if (!name) return;
        counts[name] = (counts[name] || 0) + 1;
        total++;
      });

      if (total === 0) return [];

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const top = sorted.slice(0, 4);
      const restCount = sorted.slice(4).reduce((sum, [, c]) => sum + c, 0);
      const entries = restCount > 0 ? [...top, ["Other", restCount] as [string, number]] : top;

      return entries.map(([name, count], i) => ({
        name,
        count,
        value: Math.round((count / total) * 100),
        fill: DIST_COLORS[i % DIST_COLORS.length],
      }));
    },
  });
}
