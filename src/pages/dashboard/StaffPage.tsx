import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, UserCog } from "lucide-react";
import { useStaff, type StaffMember } from "@/hooks/useStaff";
import { useOrg } from "@/hooks/useOrg";
import { AddStaffDialog } from "@/components/dashboard/AddStaffDialog";
import { EditStaffDialog } from "@/components/dashboard/EditStaffDialog";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const roleColors: Record<string, string> = {
  dentist: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  assistant: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  hygienist: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  receptionist: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  accountant: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

export default function StaffPage() {
  const { data: staff = [], isLoading } = useStaff();
  const { currentOrg } = useOrg();
  const orgRole = currentOrg?.role || "";
  const isAdmin = orgRole === "owner" || orgRole === "admin";

  const [addOpen, setAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description={`${staff.length} team members`}
        tutorial={{
          title: "Staff Management — How to Use",
          description: "Add, edit, and manage all clinic staff members and their system access roles.",
          steps: [
            {
              title: "View staff cards",
              description: "Each card shows a staff member's name, role, phone, email, and join date. Roles are color-coded: blue for Dentists, green for Hygienists, amber for Receptionists, and rose for Accountants.",
            },
            {
              title: "Add a new staff member",
              description: "Click 'Add Staff'. Enter their full name, email, phone, role, and specialty. The role determines which pages and features they can access in the system.",
              tip: "Choose roles carefully. Dentists see clinical pages. Receptionists see scheduling and patients. Accountants see billing and reports.",
            },
            {
              title: "Edit staff details",
              description: "Click the pencil icon on any staff card to edit their information or change their role. Changes take effect immediately.",
            },
            {
              title: "Understand roles & access",
              description: "Owner/Admin: full access to all pages. Dentist: clinical + scheduling. Receptionist: patients + appointments. Accountant: billing + reports. Hygienist/Assistant: limited clinical access.",
            },
            {
              title: "Manage staff accounts",
              description: "Each staff member has a login account. If a staff member leaves, you can deactivate their access to preserve historical records without deleting their data.",
            },
          ],
          nextPageHint: {
            label: "Schedules",
            description: "After adding dentists, configure their working hours on the Schedules page so appointments can be booked correctly.",
          },
        }}
      >
        {isAdmin && (
          <Button size="sm" className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Staff
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass-card"><CardContent className="p-5"><div className="flex gap-4"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-16 rounded-full" /></div></div></CardContent></Card>
          ))}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState icon={UserCog} title="No staff members" description="Add team members to manage your clinic staff." actionLabel="Add Staff" onAction={() => setAddOpen(true)} />
      ) : (
        <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" variants={stagger.container} initial="hidden" animate="visible">
          {staff.map((member) => (
            <motion.div key={member.id} variants={stagger.item}>
              <Card className="glass-card hover:shadow-lg hover:shadow-secondary/5 transition-all duration-300 group hover:border-secondary/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-border/30 group-hover:ring-secondary/30 transition-all">
                      <AvatarFallback className="bg-gradient-to-br from-secondary/20 to-secondary/5 text-secondary font-semibold">
                        {member.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-secondary transition-colors">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{member.specialty || member.role}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[member.role] || "bg-muted text-muted-foreground"}`}>
                          {member.role}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${member.status === "active" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${member.status === "active" ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                          {member.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">{member.phone}</p>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditStaff(member)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditStaffDialog staff={editStaff} open={!!editStaff} onOpenChange={(o) => !o && setEditStaff(null)} />
    </div>
  );
}