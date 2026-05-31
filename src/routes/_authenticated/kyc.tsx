import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldAlert, Clock, ShieldX, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({ meta: [{ title: "KYC Verification — CashBullX" }] }),
  component: KycPage,
});

type Submission = {
  id: string;
  status: "unverified" | "pending" | "verified" | "rejected";
  full_legal_name: string;
  date_of_birth: string;
  country: string;
  id_type: string;
  id_number: string;
  id_front_path: string;
  id_back_path: string | null;
  selfie_path: string | null;
  rejection_reason: string | null;
  submitted_at: string;
};

const ID_TYPES = ["Passport", "National ID", "Driving License"];

function StatusBadge({ status }: { status: Submission["status"] | "unverified" }) {
  const map = {
    unverified: { label: "Unverified", Icon: ShieldAlert, cls: "bg-muted text-muted-foreground" },
    pending: { label: "Under Review", Icon: Clock, cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
    verified: { label: "Verified", Icon: ShieldCheck, cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
    rejected: { label: "Rejected", Icon: ShieldX, cls: "bg-rose-500/15 text-rose-400 border border-rose-500/30" },
  }[status];
  const Icon = map.Icon;
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${map.cls}`}><Icon className="h-3.5 w-3.5" /> {map.label}</span>;
}

function KycPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_legal_name: "",
    date_of_birth: "",
    country: "",
    id_type: "Passport",
    id_number: "",
  });
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("kyc_submissions").select("*").eq("user_id", user.id).maybeSingle();
    setSubmission((data as Submission) ?? null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const status: Submission["status"] = submission?.status ?? "unverified";
  const editable = status === "unverified" || status === "rejected";

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (form.full_legal_name && form.full_legal_name.trim().length < 3) e.full_legal_name = "Enter your full legal name";
    if (form.date_of_birth) {
      const age = (Date.now() - new Date(form.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 18) e.date_of_birth = "You must be at least 18";
      if (age > 120) e.date_of_birth = "Invalid date";
    }
    if (form.id_number && form.id_number.trim().length < 3) e.id_number = "Enter a valid ID number";
    return e;
  }, [form]);

  const uploadFile = async (file: File, label: string) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/${label}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_legal_name.trim() || !form.date_of_birth || !form.country.trim() || !form.id_number.trim()) {
      toast.error("Fill in all required fields"); return;
    }
    if (Object.keys(errors).length) { toast.error("Fix validation errors"); return; }
    if (!frontFile || !selfieFile) { toast.error("Upload ID front and selfie"); return; }
    setSubmitting(true);
    try {
      const [frontPath, backPath, selfiePath] = await Promise.all([
        uploadFile(frontFile, "id-front"),
        backFile ? uploadFile(backFile, "id-back") : Promise.resolve(null),
        uploadFile(selfieFile, "selfie"),
      ]);
      const payload = {
        user_id: user.id,
        full_legal_name: form.full_legal_name.trim(),
        date_of_birth: form.date_of_birth,
        country: form.country.trim(),
        id_type: form.id_type,
        id_number: form.id_number.trim(),
        id_front_path: frontPath!,
        id_back_path: backPath,
        selfie_path: selfiePath!,
        status: "pending" as const,
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("kyc_submissions").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Submitted — your KYC is under review");
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Identity Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Verify your identity to unlock withdrawals and higher limits.</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === "verified" && (
        <Card className="p-6 bg-emerald-500/5 border-emerald-500/20">
          <div className="flex gap-3 items-start">
            <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold">Your identity is verified</p>
              <p className="text-sm text-muted-foreground mt-1">You have full access to all platform features including withdrawals.</p>
            </div>
          </div>
        </Card>
      )}

      {status === "pending" && (
        <Card className="p-6 bg-amber-500/5 border-amber-500/20">
          <div className="flex gap-3 items-start">
            <Clock className="h-6 w-6 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">Your KYC is under review</p>
              <p className="text-sm text-muted-foreground mt-1">We typically review submissions within 24–48 hours. You'll be notified once reviewed.</p>
            </div>
          </div>
        </Card>
      )}

      {status === "rejected" && submission?.rejection_reason && (
        <Card className="p-6 bg-rose-500/5 border-rose-500/20">
          <div className="flex gap-3 items-start">
            <ShieldX className="h-6 w-6 text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold">Your KYC was rejected</p>
              <p className="text-sm text-muted-foreground mt-1">Reason: {submission.rejection_reason}</p>
              <p className="text-xs text-muted-foreground mt-2">Please correct the issue and resubmit below.</p>
            </div>
          </div>
        </Card>
      )}

      {status === "unverified" && (
        <Card className="p-4 bg-muted/30 border-border/50">
          <p className="text-sm text-muted-foreground">⚠️ Unverified accounts have limited access. Withdrawals and high-value tasks require verification.</p>
        </Card>
      )}

      {editable ? (
        <Card className="p-6 glass-strong">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Full legal name *</Label>
                <Input className="mt-1 h-11" value={form.full_legal_name} onChange={(e) => setForm({ ...form, full_legal_name: e.target.value })} placeholder="As shown on your ID" />
                {errors.full_legal_name && <p className="text-xs text-destructive mt-1">{errors.full_legal_name}</p>}
              </div>
              <div>
                <Label>Date of birth *</Label>
                <Input type="date" className="mt-1 h-11" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                {errors.date_of_birth && <p className="text-xs text-destructive mt-1">{errors.date_of_birth}</p>}
              </div>
              <div>
                <Label>Country of residence *</Label>
                <Input className="mt-1 h-11" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. Pakistan" />
              </div>
              <div>
                <Label>ID type *</Label>
                <Select value={form.id_type} onValueChange={(v) => setForm({ ...form, id_type: v })}>
                  <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ID number *</Label>
                <Input className="mt-1 h-11" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
                {errors.id_number && <p className="text-xs text-destructive mt-1">{errors.id_number}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FileDrop label="ID Front *" file={frontFile} onChange={setFrontFile} />
              <FileDrop label="ID Back (if applicable)" file={backFile} onChange={setBackFile} />
              <FileDrop label="Selfie with ID *" file={selfieFile} onChange={setSelfieFile} />
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-11 btn-primary-gradient">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : "Submit for review →"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Your documents are encrypted and used only for verification.</p>
          </form>
        </Card>
      ) : (
        submission && (
          <Card className="p-6 glass-strong">
            <h3 className="font-semibold mb-4">Submitted information</h3>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Info label="Full name" value={submission.full_legal_name} />
              <Info label="Date of birth" value={submission.date_of_birth} />
              <Info label="Country" value={submission.country} />
              <Info label="ID type" value={submission.id_type} />
              <Info label="ID number" value={"••••" + submission.id_number.slice(-4)} />
              <Info label="Submitted" value={new Date(submission.submitted_at).toLocaleString()} />
            </dl>
          </Card>
        )
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function FileDrop({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 relative border border-dashed border-border/60 rounded-lg p-3 hover:border-primary/60 transition cursor-pointer min-h-32 flex items-center justify-center overflow-hidden bg-muted/20">
        {preview ? (
          <img src={preview} alt="" className="max-h-32 object-contain" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Upload className="h-5 w-5 mx-auto" />
            <p className="text-xs mt-1">Click to upload</p>
          </div>
        )}
        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </div>
    </label>
  );
}