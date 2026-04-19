import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, Send, GraduationCap, Phone, Mail, Calendar, Hash, BookOpen, MapPin } from "lucide-react";
import { toast } from "sonner";

interface StudentProfile {
  user_id: string; full_name: string; email: string | null;
  roll_number: string | null; branch: string | null; semester: string | null;
  section: string | null; phone: string | null; avatar_url: string | null;
  course?: string | null; year?: string | null; dob?: string | null; aadhar?: string | null;
}
interface Message { id: string; sender_id: string; recipient_id: string; message: string; created_at: string; }

export const StudentDirectory = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studentIds, setStudentIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [unreadFrom, setUnreadFrom] = useState<Record<string, number>>({});
  const endRef = useRef<HTMLDivElement>(null);

  // Load only student-role users
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      const ids = (roles ?? []).map((r) => r.user_id);
      setStudentIds(new Set(ids));
      if (ids.length === 0) return;
      const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids).order("roll_number");
      setStudents((profs as StudentProfile[]) ?? []);
    })();
  }, []);

  // Track unread message counts per sender
  useEffect(() => {
    if (!user) return;
    supabase
      .from("chat_messages")
      .select("sender_id")
      .eq("recipient_id", user.id)
      .eq("read", false)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data ?? []).forEach((m: any) => { counts[m.sender_id] = (counts[m.sender_id] ?? 0) + 1; });
        setUnreadFrom(counts);
      });

    const channel = supabase
      .channel("faculty-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `recipient_id=eq.${user.id}` }, (payload) => {
        const msg = payload.new as Message;
        if (active && msg.sender_id === active.user_id) {
          setMessages((prev) => [...prev, msg]);
        } else {
          setUnreadFrom((u) => ({ ...u, [msg.sender_id]: (u[msg.sender_id] ?? 0) + 1 }));
          const sender = students.find((s) => s.user_id === msg.sender_id);
          toast.message(sender?.full_name ?? "New message", { description: msg.message });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, active, students]);

  // Load conversation when opening a student
  useEffect(() => {
    if (!user || !active) return;
    supabase
      .from("chat_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.user_id}),and(sender_id.eq.${active.user_id},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));
    // mark messages from this student as read
    supabase.from("chat_messages").update({ read: true })
      .eq("sender_id", active.user_id).eq("recipient_id", user.id).eq("read", false)
      .then(() => setUnreadFrom((u) => ({ ...u, [active.user_id]: 0 })));
  }, [user, active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.full_name, s.roll_number, s.branch, s.section].some((v) => v?.toLowerCase().includes(q))
    );
  }, [students, search]);

  const send = async () => {
    if (!user || !active || !text.trim()) return;
    const { error } = await supabase.from("chat_messages").insert({
      sender_id: user.id, recipient_id: active.user_id, message: text.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setText("");
      // optimistic append (realtime won't fire for own inserts via filter)
      setMessages((m) => [...m, { id: crypto.randomUUID(), sender_id: user.id, recipient_id: active.user_id, message: text.trim(), created_at: new Date().toISOString() }]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">My Students</h1>
          <p className="text-muted-foreground text-sm">Tap a card to view profile or message the student.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, roll, section…" className="pl-9" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, i) => (
          <button
            key={s.user_id}
            onClick={() => setActive(s)}
            className="glass rounded-2xl p-4 text-left hover-lift hover-glow group animate-slide-up relative"
            style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
          >
            {unreadFrom[s.user_id] > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground">{unreadFrom[s.user_id]}</Badge>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold shadow-glow group-hover:scale-110 transition-transform">
                {s.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.full_name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">{s.roll_number}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {s.branch && <Badge variant="secondary">{s.branch}</Badge>}
              {s.semester && <Badge variant="secondary">Sem {s.semester}</Badge>}
              {s.section && <Badge variant="secondary">{s.section}</Badge>}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-12">No students found.</p>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="glass-strong max-w-3xl p-0 overflow-hidden animate-scale-in">
          {active && (
            <div className="grid md:grid-cols-2 max-h-[85vh]">
              {/* LEFT: Profile */}
              <div className="p-5 border-r border-border overflow-y-auto">
                <DialogTitle className="sr-only">{active.full_name}</DialogTitle>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-14 w-14 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-xl shadow-glow">
                    {active.full_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold">{active.full_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{active.roll_number}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <Field icon={<Hash className="h-4 w-4" />} label="Roll No" value={active.roll_number} />
                  <Field icon={<MapPin className="h-4 w-4" />} label="Section" value={active.section} />
                  <Field icon={<BookOpen className="h-4 w-4" />} label="Course" value={active.course ?? "B.Tech"} />
                  <Field icon={<GraduationCap className="h-4 w-4" />} label="Branch" value={active.branch} />
                  <Field icon={<Calendar className="h-4 w-4" />} label="Year / Sem" value={[active.year, active.semester && `Sem ${active.semester}`].filter(Boolean).join(" • ") || null} />
                  <Field icon={<Phone className="h-4 w-4" />} label="Mobile" value={active.phone} />
                  <Field icon={<Mail className="h-4 w-4" />} label="Email" value={active.email} />
                  <Field icon={<Calendar className="h-4 w-4" />} label="Date of Birth" value={active.dob} />
                  <Field icon={<Hash className="h-4 w-4" />} label="Aadhar" value={active.aadhar} />
                </div>
              </div>

              {/* RIGHT: Chat */}
              <div className="flex flex-col h-[85vh] md:h-auto">
                <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <div className="font-semibold text-sm">Message</div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[300px]">
                  {messages.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Start the conversation.</p>
                  ) : messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"} animate-fade-in`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {m.message}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                <div className="p-2 border-t border-border flex gap-2">
                  <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" />
                  <Button size="sm" onClick={send}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) => (
  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value || <span className="text-muted-foreground italic">—</span>}</div>
    </div>
  </div>
);
