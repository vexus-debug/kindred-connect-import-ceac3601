import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { toast } from "@/hooks/use-toast";

export interface WaitingListEntry {
  id: string;
  org_id: string;
  patient_id: string;
  appointment_id: string | null;
  status: string;
  check_in_time: string;
  called_time: string | null;
  seen_time: string | null;
  completed_time: string | null;
  chair: string | null;
  priority: number;
  notes: string | null;
  created_at: string;
  patients?: { first_name: string; last_name: string; phone: string | null };
}

export function useWaitingList() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;
  return useQuery({
    queryKey: ["waiting-list", orgId],
    enabled: !!orgId,
    refetchInterval: 15000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("waiting_list")
        .select("*, patients(first_name, last_name, phone)")
        .eq("org_id", orgId)
        .gte("created_at", `${today}T00:00:00`)
        .order("priority", { ascending: false })
        .order("check_in_time", { ascending: true });
      if (error) throw error;
      return (data || []) as WaitingListEntry[];
    },
  });
}

export function useAddToWaitingList() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (entry: { patient_id: string; appointment_id?: string; notes?: string; priority?: number }) => {
      const { error } = await (supabase as any).from("waiting_list").insert({
        ...entry,
        org_id: currentOrg?.org_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waiting-list"] });
      toast({ title: "Patient added to queue" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateWaitingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, chair }: { id: string; status: string; chair?: string }) => {
      const updates: any = { status };
      if (status === "called") updates.called_time = new Date().toISOString();
      if (status === "in_progress") updates.seen_time = new Date().toISOString();
      if (status === "completed") updates.completed_time = new Date().toISOString();
      if (chair) updates.chair = chair;
      const { error } = await (supabase as any).from("waiting_list").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waiting-list"] });
      toast({ title: "Queue updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
