import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IdCard, Fingerprint, Ticket, Camera, ScrollText, FolderOpen, Eye, Download, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { signedUrlFor, downloadStudentDoc } from "@/lib/studentDocs";

interface DocRow { id: string; title: string; file_url: string; type: string; created_at: string }

type CardKey = "id_card" | "photo" | "aadhaar" | "admit_card" | "marksheet" | "other";

const CARDS: { key: CardKey; label: string; desc: string; icon: any }[] = [
  { key: "id_card", label: "ID Card", desc: "Digital college identity card", icon: IdCard },
  { key: "photo", label: "Profile Photo", desc: "Synced across the ERP", icon: Camera },
  { key: "aadhaar", label: "Aadhaar Card", desc: "Government identity proof", icon: Fingerprint },
  { key: "admit_card", label: "Admit Card", desc: "Exam hall ticket", icon: Ticket },
  { key: "marksheet", label: "Marksheet", desc: "Semester grade cards", icon: ScrollText },
  { key: "other", label: "Other Documents", desc: "Certificates & receipts", icon: FolderOpen },
];

const isImage = (p: string) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(p);

/** Opens a private stored file inside the popup instead of a new tab. */
const FilePreview = ({ doc }: { doc: DocRow }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { signedUrlFor(doc.file_url).then(setUrl); }, [doc.file_url]);
  if (!url) return <div className="h-64 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  return isImage(doc.file_url)
    ? <img src={url} alt={doc.title} className="w-full max-h-[65vh] object-contain rounded-lg" />
    : <iframe src={url} title={doc.title} className="w-full h-[65vh] rounded-lg bg-background" />;
};

export const MyDocuments = () => {
  const { user, profile } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<CardKey | null>(null);
  const [viewDoc, setViewDoc] = useState<DocRow | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("student_documents").select("id,title,file_url,type,created_at")
      .eq("student_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setDocs((data ?? []) as DocRow[]); setLoading(false); });
  }, [user?.id]);

  const docsFor = (k: CardKey) =>
    k === "other" ? docs.filter((d) => !["aadhaar", "admit_card", "marksheet", "id_card"].includes(d.type))
    : k === "photo" ? [] : docs.filter((d) => d.type === k);

  const count = (k: CardKey) =>
    k === "id_card" ? 1 + docsFor(k).length : k === "photo" ? (profile?.avatar_url ? 1 : 0) : docsFor(k).length;

  const IdCardView = () => (
    <div id="id-card-print" className="mx-auto w-full max-w-sm rounded-2xl overflow-hidden border border-border shadow-glow bg-card">
      <div className="gradient-bg text-primary-foreground px-4 py-3 text-center">
        <div className="font-display font-bold">KNMIET</div>
        <div className="text-[11px] opacity-90">Student Identity Card</div>
      </div>
      <div className="p-4 flex flex-col items-center gap-3">
        <UserAvatar name={profile?.full_name} src={profile?.avatar_url} className="w-24 h-24 text-3xl ring-4 ring-primary/30" />
        <div className="text-lg font-bold text-center">{profile?.full_name}</div>
        <div className="w-full grid grid-cols-2 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">Roll No</span><span className="font-mono text-right">{profile?.roll_number ?? "—"}</span>
          <span className="text-muted-foreground">Branch</span><span className="text-right">{profile?.branch ?? "—"}</span>
          <span className="text-muted-foreground">Semester</span><span className="text-right">{profile?.semester ?? "—"}</span>
          <span className="text-muted-foreground">Section</span><span className="text-right">{profile?.section ?? "—"}</span>
          <span className="text-muted-foreground">Session</span><span className="text-right">{profile?.session ?? "—"}</span>
          <span className="text-muted-foreground">Phone</span><span className="text-right">{profile?.phone ?? "—"}</span>
        </div>
      </div>
    </div>
  );

  const DocList = ({ k }: { k: CardKey }) => {
    const list = docsFor(k);
    if (list.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Abhi koi document upload nahi hua. Admin/Coordinator upload karenge.</p>;
    return (
      <div className="space-y-2">
        {list.map((d) => (
          <div key={d.id} className="glass rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{d.title}</div>
              <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setViewDoc(d)}><Eye className="w-4 h-4 mr-1" />View</Button>
              <Button size="sm" onClick={() => downloadStudentDoc(d.file_url)}><Download className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const current = CARDS.find((c) => c.key === open);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">My Documents</h1>
        <p className="text-muted-foreground text-sm">Aapke saare zaroori documents ek jagah.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <button key={c.key} onClick={() => setOpen(c.key)}
            className="glass rounded-2xl p-5 text-left hover:shadow-glow hover:-translate-y-0.5 transition group">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground">
                {c.key === "photo" && profile?.avatar_url
                  ? <UserAvatar name={profile.full_name} src={profile.avatar_url} className="w-12 h-12 rounded-xl" />
                  : <c.icon className="w-6 h-6" />}
              </div>
              <Badge variant="secondary">{loading ? "…" : count(c.key)}</Badge>
            </div>
            <div className="mt-4 font-display font-semibold text-lg">{c.label}</div>
            <div className="text-xs text-muted-foreground">{c.desc}</div>
            <div className="mt-3 text-sm text-primary flex items-center gap-1"><Eye className="w-4 h-4" /> View</div>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="glass-card max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{current?.label}</DialogTitle></DialogHeader>
          {open === "id_card" && (
            <div className="space-y-4">
              <IdCardView />
              <Button variant="outline" className="w-full" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</Button>
              {docsFor("id_card").length > 0 && <DocList k="id_card" />}
            </div>
          )}
          {open === "photo" && (
            profile?.avatar_url ? (
              <div className="space-y-3">
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full max-h-[60vh] object-contain rounded-lg" />
                <Button className="w-full" asChild><a href={profile.avatar_url} download target="_blank" rel="noreferrer"><Download className="w-4 h-4 mr-2" />Download</a></Button>
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-6">Abhi photo nahi lagi. My Profile se photo lagayein.</p>
          )}
          {open && !["id_card", "photo"].includes(open) && (
            <div className="space-y-3">
              {open === "aadhaar" && (profile as any)?.aadhar && (
                <div className="glass rounded-lg p-3 text-sm">Aadhaar No: <span className="font-mono">{(profile as any).aadhar}</span></div>
              )}
              <DocList k={open} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
        <DialogContent className="glass-card max-w-3xl">
          <DialogHeader><DialogTitle>{viewDoc?.title}</DialogTitle></DialogHeader>
          {viewDoc && <FilePreview doc={viewDoc} />}
          {viewDoc && <Button onClick={() => downloadStudentDoc(viewDoc.file_url)}><Download className="w-4 h-4 mr-2" />Download</Button>}
        </DialogContent>
      </Dialog>
    </div>
  );
};
