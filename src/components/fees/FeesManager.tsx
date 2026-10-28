import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Save, Upload, Loader2, FileText, Download, Eye, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { viewStudentDoc, downloadStudentDoc } from "@/lib/studentDocs";
import { useAuth } from "@/contexts/AuthContext";
import { useIsFeeManager, fetchStudents, type StudentLite } from "@/hooks/useFeeManager";
import { generateReceiptPDF, buildReceiptNo } from "@/lib/feeReceipt";
import { toast } from "sonner";

interface FeeRow { id?: string; total_fee: number; paid_amount: number }
interface DocRow {
  id: string; title: string; file_url: string; type: string;
  receipt_no: string | null; amount: number | null; created_at: string;
}

export const FeesManager = () => {
  const { user, profile } = useAuth();
  const allowed = useIsFeeManager();

  const [students, setStudents] = useState<StudentLite[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const [fee, setFee] = useState<FeeRow>({ total_fee: 0, paid_amount: 0 });
  const [originalPaid, setOriginalPaid] = useState(0);
  const [feeLoaded, setFeeLoaded] = useState(false);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);

  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  useEffect(() => {
    if (!allowed) return;
    fetchStudents().then(setStudents);
  }, [allowed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      s.full_name.toLowerCase().includes(q) ||
      (s.roll_number ?? "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const selected = students.find((s) => s.user_id === selectedId) ?? null;

  const loadFor = async (sid: string) => {
    setFeeLoaded(false);
    const [{ data: f }, { data: d }] = await Promise.all([
      supabase.from("student_fees").select("id,total_fee,paid_amount").eq("student_id", sid).maybeSingle(),
      supabase.from("student_documents").select("id,title,file_url,type,receipt_no,amount,created_at").eq("student_id", sid).order("created_at", { ascending: false }),
    ]);
    if (f) {
      setFee({ id: f.id, total_fee: Number(f.total_fee), paid_amount: Number(f.paid_amount) });
      setOriginalPaid(Number(f.paid_amount));
    } else {
      setFee({ total_fee: 0, paid_amount: 0 });
      setOriginalPaid(0);
    }
    setDocs((d ?? []) as DocRow[]);
    setFeeLoaded(true);
  };

  useEffect(() => {
    if (selectedId) loadFor(selectedId);
  }, [selectedId]);

  const remaining = Math.max(fee.total_fee - fee.paid_amount, 0);
  const pct = fee.total_fee > 0 ? Math.min((fee.paid_amount / fee.total_fee) * 100, 100) : 0;

  const saveFee = async () => {
    if (!selected || !user) return;
    setBusy(true);
    try {
      // Server-side validated, atomic update via RPC.
      // It re-checks role, locks the row, validates total>=paid, computes remaining + diff.
      const { data, error } = await supabase.rpc("update_student_fee", {
        _student_id: selected.user_id,
        _total_fee: fee.total_fee,
        _paid_amount: fee.paid_amount,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      const diff = Number(result?.payment_diff ?? 0);

      if (diff > 0) {
        await generateAndStoreReceipt(diff);
      }
      toast.success("Fees updated");
      setOriginalPaid(fee.paid_amount);
      await loadFor(selected.user_id);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const generateAndStoreReceipt = async (paidThisTxn: number) => {
    if (!selected || !user) return;
    const receiptNo = buildReceiptNo();
    const blob = generateReceiptPDF({
      receiptNo,
      studentName: selected.full_name,
      rollNumber: selected.roll_number ?? "—",
      section: selected.section ?? "—",
      semester: selected.semester ?? "—",
      totalFee: fee.total_fee,
      paidThisTransaction: paidThisTxn,
      remainingAmount: Math.max(fee.total_fee - fee.paid_amount, 0),
      generatedBy: profile?.full_name ?? "Coordinator",
      date: new Date(),
    });
    const path = `${selected.user_id}/receipts/${receiptNo}.pdf`;
    const { error: upErr } = await supabase.storage.from("student-docs").upload(path, blob, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;
    const { error: dErr } = await supabase.from("student_documents").insert({
      student_id: selected.user_id,
      title: `Fee Receipt — ${receiptNo}`,
      file_url: path,
      type: "receipt",
      receipt_no: receiptNo,
      amount: paidThisTxn,
      uploaded_by: user.id,
    });
    if (dErr) throw dErr;
    toast.success(`Receipt ${receiptNo} generated`);
  };

  const uploadDocument = async () => {
    if (!selected || !user || !docFile || !docTitle.trim()) {
      toast.error("Select student, enter title, choose file");
      return;
    }
    setBusy(true);
    try {
      const ext = docFile.name.split(".").pop() ?? "bin";
      const path = `${selected.user_id}/docs/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("student-docs").upload(path, docFile, {
        contentType: docFile.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: dErr } = await supabase.from("student_documents").insert({
        student_id: selected.user_id,
        title: docTitle.trim(),
        file_url: path,
        type: "document",
        uploaded_by: user.id,
      });
      if (dErr) throw dErr;
      toast.success("Document uploaded");
      setDocTitle("");
      setDocFile(null);
      await loadFor(selected.user_id);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <Card className="glass-strong">
        <CardContent className="py-12 text-center">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-display font-bold text-lg">Restricted Access</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Only the Coordinator, Deputy and Admin can manage fees.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Fees & Documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage student fees and upload documents. <Badge variant="secondary" className="ml-1">Coordinator / Deputy / Admin</Badge>
        </p>
      </div>

      <Card className="glass-strong">
        <CardHeader><CardTitle>Select Student</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search by name or roll number…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {filtered.map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.full_name} {s.roll_number ? `· ${s.roll_number}` : ""}
                </SelectItem>
              ))}
              {filtered.length === 0 && <div className="p-3 text-sm text-muted-foreground text-center">No matches</div>}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selected && feeLoaded && (
        <>
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Fee Record — {selected.full_name}</span>
                <Badge variant="outline">{selected.roll_number ?? "—"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="total">Total Fee (₹)</Label>
                  <Input id="total" type="number" min={0} value={fee.total_fee}
                    onChange={(e) => setFee({ ...fee, total_fee: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="paid">Paid Amount (₹)</Label>
                  <Input id="paid" type="number" min={0} value={fee.paid_amount}
                    onChange={(e) => setFee({ ...fee, paid_amount: Number(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="glass rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                <div><div className="text-xs text-muted-foreground">Total</div><div className="font-bold">₹{fee.total_fee.toLocaleString("en-IN")}</div></div>
                <div><div className="text-xs text-muted-foreground">Paid</div><div className="font-bold text-primary">₹{fee.paid_amount.toLocaleString("en-IN")}</div></div>
                <div><div className="text-xs text-muted-foreground">Remaining</div><div className="font-bold text-destructive">₹{remaining.toLocaleString("en-IN")}</div></div>
              </div>
              <Progress value={pct} />

              {fee.paid_amount > originalPaid && (
                <div className="glass rounded-lg p-3 text-xs text-muted-foreground">
                  💡 Saving will auto-generate a receipt for the new payment of
                  <span className="font-bold text-primary"> ₹{(fee.paid_amount - originalPaid).toLocaleString("en-IN")}</span>.
                </div>
              )}

              <Button onClick={saveFee} disabled={busy} className="w-full glow-button">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save & Generate Receipt
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Document</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="dtitle">Title</Label>
                <Input id="dtitle" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Bonafide Certificate" />
              </div>
              <div>
                <Label htmlFor="dfile">File</Label>
                <Input id="dfile" type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={uploadDocument} disabled={busy} className="w-full">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Documents & Receipts</CardTitle></CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                <div className="space-y-2">
                  {docs.map((r) => (
                    <div key={r.id} className="glass rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        {r.type === "receipt" ? <Receipt className="w-4 h-4 text-primary flex-shrink-0" /> : <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                            {r.receipt_no && <Badge variant="outline" className="font-mono text-[10px]">{r.receipt_no}</Badge>}
                            {r.amount != null && <span>₹{Number(r.amount).toLocaleString("en-IN")}</span>}
                            <span>{new Date(r.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => viewStudentDoc(r.file_url)}><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" onClick={() => downloadStudentDoc(r.file_url)}><Download className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
