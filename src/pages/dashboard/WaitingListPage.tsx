import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWaitingList, useAddToWaitingList, useUpdateWaitingStatus } from "@/hooks/useWaitingList";
import { usePatients } from "@/hooks/usePatients";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Plus, Clock, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  waiting: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  called: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export default function WaitingListPage() {
  const { data: queue = [], isLoading } = useWaitingList();
  const { data: patients = [] } = usePatients();
  const addToQueue = useAddToWaitingList();
  const updateStatus = useUpdateWaitingStatus();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [notes, setNotes] = useState("");

  const activeQueue = queue.filter((q) => q.status !== "completed");
  const completedQueue = queue.filter((q) => q.status === "completed");

  const handleAdd = async () => {
    if (!selectedPatient) return;
    await addToQueue.mutateAsync({ patient_id: selectedPatient, notes: notes || undefined });
    setAddOpen(false);
    setSelectedPatient("");
    setNotes("");
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateStatus.mutateAsync({ id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waiting List"
        description={`${activeQueue.length} patients in queue`}
        tutorial={{
          title: "Waiting List — How to Use",
          description: "Manage patients who are waiting at the clinic or queued for a future availability slot.",
          steps: [
            {
              title: "View the queue",
              description: "The waiting list shows all patients currently checked in and waiting, with their check-in time and assigned dentist (if any). Patients are listed in order of arrival.",
            },
            {
              title: "Check in a patient",
              description: "Click 'Check In'. Select or register the patient, assign them to a dentist, and add the reason for their visit. They immediately appear in the waiting queue.",
              tip: "Use this for both walk-in patients and those with appointments who have arrived at the clinic.",
            },
            {
              title: "Call next patient",
              description: "When a chair becomes available, click 'Call' on the next patient in the queue to move them to 'In Progress'. This removes them from the waiting queue.",
            },
            {
              title: "Remove from queue",
              description: "If a patient leaves before being seen, click 'Remove' to take them off the queue. Always update the status in real time to avoid confusion.",
            },
            {
              title: "Monitor wait times",
              description: "Each patient entry shows how long they have been waiting. Aim to keep wait times under 30 minutes by coordinating with the clinical team on chair availability.",
            },
          ],
          nextPageHint: {
            label: "Appointments",
            description: "For patients without prior bookings who need follow-up, create a proper appointment on the Appointments page.",
          },
        }}
      >
        <Button size="sm" className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Check In
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Waiting", count: queue.filter((q) => q.status === "waiting").length, color: "text-amber-500" },
          { label: "Called", count: queue.filter((q) => q.status === "called").length, color: "text-blue-500" },
          { label: "In Progress", count: queue.filter((q) => q.status === "in_progress").length, color: "text-purple-500" },
          { label: "Completed", count: completedQueue.length, color: "text-emerald-500" },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton columns={5} rows={5} />
            ) : activeQueue.length === 0 ? (
              <EmptyState icon={Clock} title="No patients waiting" description="Check in a patient to start the queue." actionLabel="Check In" onAction={() => setAddOpen(true)} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">#</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Patient</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Wait Time</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQueue.map((entry, i) => (
                      <motion.tr
                        key={entry.id}
                        className="border-b border-border/30 last:border-0 hover:bg-accent/30 transition-all group"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <td className="py-3 px-4 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{entry.patients?.first_name} {entry.patients?.last_name}</p>
                              {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.check_in_time), { addSuffix: false })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[entry.status] || ""}`}>
                            {entry.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {entry.status === "waiting" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(entry.id, "called")}>
                                Call <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            )}
                            {entry.status === "called" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(entry.id, "in_progress")}>
                                Start <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            )}
                            {entry.status === "in_progress" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600" onClick={() => handleStatusChange(entry.id, "completed")}>
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Done
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
          <DialogHeader><DialogTitle>Check In Patient</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Patient *</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for visit..." className="bg-muted/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-secondary hover:bg-secondary/90" disabled={addToQueue.isPending}>
              {addToQueue.isPending ? "Adding..." : "Check In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
