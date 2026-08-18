import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Printer, FileText } from "lucide-react";
import { CreatePrescriptionDialog } from "@/components/dashboard/CreatePrescriptionDialog";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
};

export default function PrescriptionsPage() {
  const [rxOpen, setRxOpen] = useState(false);
  const { data: prescriptions = [], isLoading } = usePrescriptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescriptions"
        description="Digital prescriptions and medication records"
        tutorial={{
          title: "Prescriptions — How to Use",
          description: "Create, manage, and track digital prescriptions issued to patients after their dental visit.",
          steps: [
            {
              title: "View existing prescriptions",
              description: "All issued prescriptions are listed here with the patient's name, prescribing dentist, date, and status. Click any row to see the full prescription details including medications.",
            },
            {
              title: "Create a new prescription",
              description: "Click 'New Prescription'. Select the patient and the prescribing dentist. Add a diagnosis or reason for the prescription.",
              tip: "Always link prescriptions to a patient so they appear in the patient's complete medical history.",
            },
            {
              title: "Add medications",
              description: "After creating the prescription, add one or more medications. For each, specify: medication name, dosage (e.g. 500mg), frequency (e.g. twice daily), duration (e.g. 5 days), and special instructions.",
            },
            {
              title: "Issue & print",
              description: "Once all medications are added, the prescription is saved as 'Active'. You can print it directly from the detail view for the patient to take to a pharmacy.",
            },
            {
              title: "Track prescription status",
              description: "Prescriptions can be Active, Dispensed (patient has collected), or Cancelled. Update the status as needed to keep records accurate.",
            },
          ],
          nextPageHint: {
            label: "Billing & Payments",
            description: "After clinical work and prescriptions are done, create an invoice on the Billing page for the patient's visit.",
          },
        }}
      >
        <Button size="sm" className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => setRxOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Prescription
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-card"><CardContent className="p-5 space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /><Skeleton className="h-12 w-full rounded-lg" /></CardContent></Card>
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState icon={FileText} title="No prescriptions yet" description="Create a prescription to get started with digital medication records." actionLabel="New Prescription" onAction={() => setRxOpen(true)} />
      ) : (
        <motion.div className="space-y-4" variants={stagger.container} initial="hidden" animate="visible">
          {prescriptions.map((rx) => (
            <motion.div key={rx.id} variants={stagger.item}>
              <Card className="glass-card hover:shadow-lg hover:shadow-secondary/5 transition-all duration-300 group hover:border-secondary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm group-hover:text-secondary transition-colors">
                        {rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : "Unknown"}
                      </CardTitle>
                      <CardDescription className="font-mono text-[11px]">
                        {rx.staff?.full_name || "Unknown"} · {rx.prescription_date}
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rx.prescription_medications.map((med, i) => (
                      <div key={med.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/20">
                        <span className="h-5 w-5 rounded-full bg-secondary/10 text-secondary text-[10px] flex items-center justify-center font-semibold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{med.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{med.dosage} · {med.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
      <CreatePrescriptionDialog open={rxOpen} onOpenChange={setRxOpen} />
    </div>
  );
}