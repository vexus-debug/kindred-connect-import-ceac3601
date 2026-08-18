import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { toast } from "@/hooks/use-toast";

export interface InventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
  item_name?: string;
}

export function useInventoryTransactions(inventoryId?: string) {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;
  return useQuery({
    queryKey: ["inventory-transactions", orgId, inventoryId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = (supabase as any)
        .from("inventory_transactions")
        .select("*, inventory(name)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (inventoryId) query = query.eq("inventory_id", inventoryId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        item_name: t.inventory?.name || "Unknown",
      })) as InventoryTransaction[];
    },
  });
}

export function useCreateInventoryTransaction() {
  const qc = useQueryClient();
  const { currentOrg } = useOrg();
  return useMutation({
    mutationFn: async (input: {
      inventory_id: string;
      transaction_type: string;
      quantity: number;
      unit_cost: number;
      reference?: string;
      notes?: string;
    }) => {
      const totalCost = input.quantity * input.unit_cost;
      const { error } = await (supabase as any).from("inventory_transactions").insert({
        org_id: currentOrg?.org_id,
        inventory_id: input.inventory_id,
        transaction_type: input.transaction_type,
        quantity: input.quantity,
        unit_cost: input.unit_cost,
        total_cost: totalCost,
        reference: input.reference || null,
        notes: input.notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;

      // Update inventory unit_cost and quantity for purchases
      if (input.transaction_type === "purchase") {
        const { data: item } = await (supabase as any).from("inventory").select("quantity").eq("id", input.inventory_id).single();
        const newQty = (item?.quantity || 0) + input.quantity;
        await (supabase as any).from("inventory").update({
          quantity: newQty,
          unit_cost: input.unit_cost,
          last_restocked: new Date().toISOString().split("T")[0],
        }).eq("id", input.inventory_id);
      } else if (input.transaction_type === "usage") {
        const { data: item } = await (supabase as any).from("inventory").select("quantity").eq("id", input.inventory_id).single();
        const newQty = Math.max(0, (item?.quantity || 0) - input.quantity);
        await (supabase as any).from("inventory").update({ quantity: newQty }).eq("id", input.inventory_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-transactions"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-cost-analytics"] });
      toast({ title: "Transaction recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useInventoryCostAnalytics() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.org_id;
  return useQuery({
    queryKey: ["inventory-cost-analytics", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: transactions } = await (supabase as any)
        .from("inventory_transactions")
        .select("inventory_id, transaction_type, total_cost, inventory(name, category)")
        .eq("org_id", orgId);

      const { data: inventory } = await (supabase as any)
        .from("inventory")
        .select("id, name, category, quantity, unit_cost")
        .eq("org_id", orgId);

      const totalSpend = (transactions || [])
        .filter((t: any) => t.transaction_type === "purchase")
        .reduce((s: number, t: any) => s + Number(t.total_cost), 0);

      const byCategoryMap: Record<string, number> = {};
      (transactions || []).filter((t: any) => t.transaction_type === "purchase").forEach((t: any) => {
        const cat = t.inventory?.category || "Other";
        byCategoryMap[cat] = (byCategoryMap[cat] || 0) + Number(t.total_cost);
      });

      const byCategory = Object.entries(byCategoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const stockValue = (inventory || []).reduce(
        (s: number, i: any) => s + (Number(i.quantity) * Number(i.unit_cost || 0)),
        0
      );

      return { totalSpend, stockValue, byCategory };
    },
  });
}
