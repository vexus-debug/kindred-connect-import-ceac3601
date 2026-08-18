import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder } from "@/hooks/usePurchaseOrders";
import { useSuppliers } from "@/hooks/useSuppliers";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Plus, ShoppingCart, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  received: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function PurchaseOrdersPage() {
  const { data: orders = [], isLoading } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ order_number: "", supplier_id: "", notes: "", total: "" });

  const handleAdd = async () => {
    if (!form.order_number.trim()) return;
    await createOrder.mutateAsync({
      order_number: form.order_number,
      supplier_id: form.supplier_id || null,
      notes: form.notes || null,
      total: parseFloat(form.total) || 0,
      subtotal: parseFloat(form.total) || 0,
    });
    setAddOpen(false);
    setForm({ order_number: "", supplier_id: "", notes: "", total: "" });
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateOrder.mutateAsync({ id, status, ...(status === "received" ? { received_date: new Date().toISOString().split("T")[0] } : {}) });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" description={`${orders.length} orders`}>
        <Button size="sm" className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New PO
        </Button>
      </PageHeader>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : orders.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No purchase orders" description="Create a purchase order to track supplier orders." actionLabel="New PO" onAction={() => setAddOpen(true)} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">PO #</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Supplier</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Total</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((po, i) => (
                      <motion.tr key={po.id} className="border-b border-border/30 last:border-0 hover:bg-accent/30 transition-all group" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                        <td className="py-3 px-4 font-medium font-mono">{po.order_number}</td>
                        <td className="py-3 px-4 text-muted-foreground">{po.suppliers?.name || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground">{format(new Date(po.order_date), "dd MMM yyyy")}</td>
                        <td className="py-3 px-4 font-semibold">₦{Number(po.total).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[po.status] || ""}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {po.status === "draft" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(po.id, "ordered")}>
                                Mark Ordered
                              </Button>
                            )}
                            {po.status === "ordered" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600" onClick={() => handleStatusChange(po.id, "received")}>
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Received
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="backdrop-blur-xl bg-card/95">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">PO Number *</Label>
              <Input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} placeholder="PO-001" className="bg-muted/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total Amount</Label>
              <Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} placeholder="0" className="bg-muted/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-muted/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-secondary hover:bg-secondary/90" disabled={createOrder.isPending}>
              {createOrder.isPending ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
