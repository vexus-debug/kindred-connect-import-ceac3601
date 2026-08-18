import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSuppliers, useCreateSupplier, useDeleteSupplier } from "@/hooks/useSuppliers";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Plus, Trash2, Truck } from "lucide-react";
import { motion } from "framer-motion";

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_person: "", email: "", phone: "", address: "", notes: "" });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await createSupplier.mutateAsync(form);
    setAddOpen(false);
    setForm({ name: "", contact_person: "", email: "", phone: "", address: "", notes: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description={`${suppliers.length} suppliers`}>
        <Button size="sm" className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </PageHeader>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={6} rows={5} />
            ) : suppliers.length === 0 ? (
              <EmptyState icon={Truck} title="No suppliers" description="Add suppliers to manage your vendor relationships." actionLabel="Add Supplier" onAction={() => setAddOpen(true)} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Contact</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Email</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Phone</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s, i) => (
                      <motion.tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-accent/30 transition-all group" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                        <td className="py-3 px-4 font-medium group-hover:text-secondary transition-colors">{s.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{s.contact_person || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{s.email || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{s.phone || "—"}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteSupplier.mutateAsync(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Contact Person</Label>
                <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="bg-muted/30" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-muted/30" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-muted/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-muted/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-secondary hover:bg-secondary/90" disabled={createSupplier.isPending}>
              {createSupplier.isPending ? "Adding..." : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
