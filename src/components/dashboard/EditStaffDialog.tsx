import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateStaff, type StaffMember } from "@/hooks/useStaff";
import { useOrg } from "@/hooks/useOrg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, KeyRound } from "lucide-react";

const roles = ["dentist", "assistant", "hygienist", "receptionist", "accountant", "lab_technician", "lab_assistant"];

interface EditStaffDialogProps {
  staff: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStaffDialog({ staff, open, onOpenChange }: EditStaffDialogProps) {
  const updateStaff = useUpdateStaff();
  const { currentOrg } = useOrg();
  const [form, setForm] = useState({ full_name: "", role: "dentist", phone: "", email: "", specialty: "", status: "active" });
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (staff) {
      setForm({
        full_name: staff.full_name,
        role: staff.role,
        phone: staff.phone || "",
        email: staff.email || "",
        specialty: staff.specialty || "",
        status: staff.status,
      });
      setNewPassword("");
      setChangingPassword(false);
    }
  }, [staff]);

  const hasLinkedAccount = !!staff?.user_id;

  const handleSave = async () => {
    if (!staff) return;
    setIsSaving(true);
    try {
      await updateStaff.mutateAsync({ id: staff.id, ...form });

      // If password change requested and staff has a linked user account
      if (changingPassword && newPassword.trim() && hasLinkedAccount) {
        if (newPassword.length < 6) {
          toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
          setIsSaving(false);
          return;
        }

        const res = await supabase.functions.invoke("manage-staff-user", {
          body: {
            action: "update_password",
            org_id: currentOrg?.org_id,
            user_id: staff.user_id,
            password: newPassword,
          },
        });

        if (res.error || res.data?.error) {
          toast({
            title: "Staff updated but password change failed",
            description: res.data?.error || res.error?.message || "Could not update password.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Password updated", description: `Password for ${staff.full_name} has been changed.` });
        }
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>Update details for {staff?.full_name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Full Name *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Specialty</Label>
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password change section */}
          {hasLinkedAccount && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs font-medium">Change Password</Label>
                    <p className="text-[11px] text-muted-foreground">Set a new password for this staff member</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setChangingPassword(!changingPassword)}
                >
                  {changingPassword ? "Cancel" : "Change"}
                </Button>
              </div>
              {changingPassword && (
                <div className="space-y-1">
                  <Label className="text-xs">New Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasLinkedAccount && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                This staff member doesn't have a login account. To create one, delete and re-add them with the "Create Login Account" option.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
