import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, FileText, Download, Eye, Receipt, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FeeRow { total_fee: number; paid_amount: number; updated_at: string }
interface DocRow {
  id: string; title: string; file_url: string; type: string;
  receipt_no: string | null; amount: number | null; created_at: string;
}

export const StudentFees = () => {
  const { user } = useAuth();
  const [fee, setFee] = useState<FeeRow | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: f }, { data: d }] = await Promise.all([
      supabase.from("student_fees").select("total_fee, paid_amount, updated_at").eq("student_id", user.id).maybeSingle(),
      supabase.from("student_documents").select("id,title,file_url,type,receipt_no,amount,created_at").eq("student_id", user.id).order("created_at", { ascending: false }),
    ]);
    setFee(f as FeeRow | null);
    setDocs((d ?? []) as DocRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`fees_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_fees", filter: `student_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_documents", filter: `student_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const total = fee?.total_fee ?? 0;
  const paid = fee?.paid_amount ?? 0;
  const remaining = Math.max(total - paid, 0);
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

  const receipts = docs.filter((d) => d.type === "receipt");
  const others = docs.filter((d) => d.type !== "receipt");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" /> Fees & Documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your fee summary, receipts and uploaded documents.</p>
      </div>

      <Card className="glass-strong">
        <CardHeader><CardTitle>Fee Summary</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : !fee ? (
            <p className="text-sm text-muted-foreground">No fee record yet. Please contact the coordinator.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-muted-foreground">Total Fee</div>
                  <div className="text-2xl font-bold mt-1">₹{total.toLocaleString("en-IN")}</div>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-muted-foreground">Paid</div>
                  <div className="text-2xl font-bold mt-1 text-primary">₹{paid.toLocaleString("en-IN")}</div>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className="text-2xl font-bold mt-1 text-destructive">₹{remaining.toLocaleString("en-IN")}</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Payment progress</span><span>{pct.toFixed(0)}%</span>
                </div>
                <Progress value={pct} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-strong">
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Receipts</CardTitle></CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No receipts yet.</p>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="glass rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      {r.receipt_no && <Badge variant="outline" className="font-mono text-[10px]">{r.receipt_no}</Badge>}
                      {r.amount != null && <span>₹{Number(r.amount).toLocaleString("en-IN")}</span>}
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" asChild><a href={r.file_url} target="_blank" rel="noreferrer"><Eye className="w-4 h-4" /></a></Button>
                    <Button size="sm" asChild><a href={r.file_url} download><Download className="w-4 h-4" /></a></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-strong">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Documents</CardTitle></CardHeader>
        <CardContent>
          {others.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <div className="space-y-2">
              {others.map((r) => (
                <div key={r.id} className="glass rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" asChild><a href={r.file_url} target="_blank" rel="noreferrer"><Eye className="w-4 h-4" /></a></Button>
                    <Button size="sm" asChild><a href={r.file_url} download><Download className="w-4 h-4" /></a></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
