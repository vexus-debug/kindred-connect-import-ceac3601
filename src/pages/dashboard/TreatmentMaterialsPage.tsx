import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTreatmentMaterials, useCreateTreatmentMaterial, useDeleteTreatmentMaterial } from "@/hooks/useTreatmentMaterials";
import { useTreatments } from "@/hooks/useTreatments";
import { useInventory } from "@/hooks/useInventory";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Plus, Trash2, Link2 } from "lucide-react";
import { motion } from "framer-motion";

export default function TreatmentMaterialsPage() {
  const { data: materials = [], isLoading } = useTreatmentMaterials();
  const { data: treatments = [] } = useTreatments();
  const { data: inventory = [] } = useInventory();
  const createMaterial = useCreateTreatmentMaterial();
  const deleteMaterial = useDeleteTreatmentMaterial();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ treatment_id: "", inventory_id: "", quantity_used: "1" });

  const handleAdd = async () => {
    if (!form.treatment_id || !form.inventory_id) return;
    await createMaterial.mutateAsync({
      treatment_id: form.treatment_id,
      inventory_id: form.inventory_id,
      quantity_used: parseFloat(form.quantity_used) || 1,
    });
    setAddOpen(false);
    setForm({ treatment_id: "", inventory_id: "", quantity_used: "1" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Treatment Materials" description="Map treatments to inventory consumption">
        <Button size="sm" className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Mapping
        </Button>
      </PageHeader>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={4} rows={5} />
            ) : materials.length === 0 ? (
              <EmptyState icon={Link2} title="No material mappings" description="Link treatments to inventory items to track material usage." actionLabel="Add Mapping" onAction={() => setAddOpen(true)} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Treatment</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Material</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Qty Used</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m, i) => (
                      <motion.tr key={m.id} className="border-b border-border/30 last:border-0 hover:bg-accent/30 transition-all group" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                        <td className="py-3 px-4 font-medium">{m.treatments?.name || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground">{m.inventory?.name || "—"}</td>
                        <td className="py-3 px-4">{m.quantity_used} {m.inventory?.unit || ""}</td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMaterial.mutateAsync(m.id)}>
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
          <DialogHeader><DialogTitle>Map Treatment to Material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Treatment *</Label>
              <Select value={form.treatment_id} onValueChange={(v) => setForm({ ...form, treatment_id: v })}>
                <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select treatment" /></SelectTrigger>
                <SelectContent>
                  {treatments.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inventory Item *</Label>
              <Select value={form.inventory_id} onValueChange={(v) => setForm({ ...form, inventory_id: v })}>
                <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} ({item.unit})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity Used Per Treatment</Label>
              <Input type="number" value={form.quantity_used} onChange={(e) => setForm({ ...form, quantity_used: e.target.value })} className="bg-muted/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-secondary hover:bg-secondary/90" disabled={createMaterial.isPending}>
              {createMaterial.isPending ? "Adding..." : "Add Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
