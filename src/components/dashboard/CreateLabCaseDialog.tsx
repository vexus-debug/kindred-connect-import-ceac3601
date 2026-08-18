import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

import { usePatients } from "@/hooks/usePatients";
import { useDentists } from "@/hooks/useStaff";
import { useCreateLabCase } from "@/hooks/useLabCases";

const JOB_INSTRUCTION_OPTIONS = [
  "Courier Charge",
  "Acrylic Dentures",
  "Flexible Dentures",
  "AJC Crowns",
  "PFM Crowns",
  "Zirconia Crowns",
  "Shell Crowns (Gold)",
  "Shell Crowns (Silver)",
  "VFR",
  "Orthodontic Appliances",
  "Denture Repair",
  "Crown Repair",
  "Gingival Masking",
] as const;

const REMARK_OPTIONS = [
  "Express",
  "Rejected",
  "Damaged",
  "Repeat",
  "Remake",
] as const;

const labCaseSchema = z.object({
  clinicCode: z.string().optional(),
  clinicDoctorName: z.string().min(1, "Required"),
  patientId: z.string().min(1, "Select a patient"),
  dentistId: z.string().min(1, "Select a dentist"),
  jobInstructions: z.array(z.string()).min(1, "Select at least one"),
  jobDescription: z.string().optional(),
  shade: z.string().optional(),
  cost: z.coerce.number().min(0, "Must be >= 0"),
  discount: z.coerce.number().min(0).default(0),
  dueDate: z.date({ required_error: "Select delivery date" }),
  isPaid: z.boolean().default(false),
  remark: z.string().optional(),
  instructions: z.string().optional(),
});

type LabCaseFormValues = z.infer<typeof labCaseSchema>;

interface CreateLabCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLabCaseDialog({ open, onOpenChange }: CreateLabCaseDialogProps) {
  const { data: patients = [] } = usePatients();
  const { data: dentists = [] } = useDentists();
  const createLabCase = useCreateLabCase();

  const form = useForm<LabCaseFormValues>({
    resolver: zodResolver(labCaseSchema),
    defaultValues: {
      clinicCode: "",
      clinicDoctorName: "",
      patientId: "",
      dentistId: "",
      jobInstructions: [],
      jobDescription: "",
      shade: "",
      cost: 0,
      discount: 0,
      isPaid: false,
      remark: "none",
      instructions: "",
    },
  });

  function onSubmit(data: LabCaseFormValues) {
    const workType = data.jobInstructions.join(", ");
    createLabCase.mutate(
      {
        patient_id: data.patientId,
        dentist_id: data.dentistId,
        work_type: workType,
        clinic_code: data.clinicCode || "",
        clinic_doctor_name: data.clinicDoctorName,
        job_instructions: data.jobInstructions,
        job_description: data.jobDescription || "",
        shade: data.shade || "",
        lab_fee: data.cost,
        discount: data.discount,
        due_date: format(data.dueDate, "yyyy-MM-dd"),
        is_paid: data.isPaid,
        remark: data.remark === "none" ? "" : (data.remark || ""),
        instructions: data.instructions || "",
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Lab Registration</DialogTitle>
          <DialogDescription>Register a new lab case with job details.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Clinic Code & Doctor Name */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="clinicCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic Code</FormLabel>
                  <FormControl><Input placeholder="e.g. VC-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="clinicDoctorName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic / Doctor Name *</FormLabel>
                  <FormControl><Input placeholder="Dr. Smith / ABC Clinic" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Patient & Dentist */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="patientId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dentistId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dentist *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select dentist" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dentists.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Job Instructions (multi-select checkboxes) */}
            <FormField control={form.control} name="jobInstructions" render={() => (
              <FormItem>
                <FormLabel>Job Instructions *</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded-lg bg-muted/20">
                  {JOB_INSTRUCTION_OPTIONS.map((option) => (
                    <FormField
                      key={option}
                      control={form.control}
                      name="jobInstructions"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(option)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...current, option]
                                    : current.filter((v: string) => v !== option)
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal cursor-pointer">{option}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />

            {/* Job Description */}
            <FormField control={form.control} name="jobDescription" render={({ field }) => (
              <FormItem>
                <FormLabel>Job Description</FormLabel>
                <FormControl><Textarea placeholder="Additional job details..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Shade, Cost, Discount */}
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField control={form.control} name="shade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Shade</FormLabel>
                  <FormControl><Input placeholder="e.g. A2, B1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost (₦) *</FormLabel>
                  <FormControl><Input type="number" min={0} step={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="discount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount (₦)</FormLabel>
                  <FormControl><Input type="number" min={0} step={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Due Date & Remark */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expected Delivery Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="remark" render={({ field }) => (
                <FormItem>
                  <FormLabel>Remark</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select remark" /></SelectTrigger>
                    </FormControl>
                     <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {REMARK_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Payment Status Toggle */}
            <FormField control={form.control} name="isPaid" render={({ field }) => (
              <FormItem className="flex items-center gap-3 rounded-lg border p-3 bg-muted/20">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel className="text-sm font-medium">Payment Status</FormLabel>
                  <p className="text-xs text-muted-foreground">{field.value ? "Paid" : "Unpaid"}</p>
                </div>
              </FormItem>
            )} />

            {/* Special Instructions */}
            <FormField control={form.control} name="instructions" render={({ field }) => (
              <FormItem>
                <FormLabel>Special Instructions</FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="bg-secondary hover:bg-secondary/90" disabled={createLabCase.isPending}>
                {createLabCase.isPending ? "Creating..." : "Register Lab Case"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
