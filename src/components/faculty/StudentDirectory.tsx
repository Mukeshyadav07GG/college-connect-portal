import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, MessageCircle, Send, GraduationCap, Phone, Mail,
  Calendar, Hash, BookOpen, MapPin, User as UserIcon,
} from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState<StudentProfile | null>(null);
  const [chatOpen, setChatOpen] = useState<StudentProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [unreadFrom, setUnreadFrom] = useState<Record<string, number>>({});
  const endRef = useRef<HTMLDivElement>(null);

  // Load only student-role users
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return;
      const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids).order("roll_number");
      setStudents((profs as StudentProfile[]) ?? []);
    })();
  }, []);

  // Inbox: unread counts + realtime appending into the open chat
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
        if (chatOpen && msg.sender_id === chatOpen.user_id) {
          setMessages((prev) => [...prev, msg]);
        } else {
          setUnreadFrom((u) => ({ ...u, [msg.sender_id]: (u[msg.sender_id] ?? 0) + 1 }));
          const sender = students.find((s) => s.user_id === msg.sender_id);
          toast.message(sender?.full_name ?? "New message", { description: msg.message });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, chatOpen, students]);

  // Load conversation when opening chat
  useEffect(() => {
    if (!user || !chatOpen) return;
    supabase
      .from("chat_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${chatOpen.user_id}),and(sender_id.eq.${chatOpen.user_id},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));
    supabase.from("chat_messages").update({ read: true })
      .eq("sender_id", chatOpen.user_id).eq("recipient_id", user.id).eq("read", false)
      .then(() => setUnreadFrom((u) => ({ ...u, [chatOpen.user_id]: 0 })));
  }, [user, chatOpen]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.full_name, s.roll_number, s.branch, s.section].some((v) => v?.toLowerCase().includes(q))
    );
  }, [students, search]);

  const send = async () => {
    if (!user || !chatOpen || !text.trim()) return;
    const body = text.trim();
    setText("");
    const { error, data } = await supabase
      .from("chat_messages")
      .insert({ sender_id: user.id, recipient_id: chatOpen.user_id, message: body })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setMessages((m) => [...m, data as Message]);
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">My Students</h1>
          <p className="text-muted-foreground text-sm">View a student's profile or message them directly.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, roll, section…" className="pl-9" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, i) => (
          <div
            key={s.user_id}
            className="glass rounded-2xl p-4 flex flex-col hover-lift hover-glow group animate-slide-up relative transition-all"
            style={{ animationDelay: `${Math.min(i, 20) * 30}ms` }}
          >
            {unreadFrom[s.user_id] > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground animate-pulse">
                {unreadFrom[s.user_id]}
              </Badge>
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
            <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
              {s.branch && <Badge variant="secondary">{s.branch}</Badge>}
              {s.semester && <Badge variant="secondary">Sem {s.semester}</Badge>}
              {s.section && <Badge variant="secondary">{s.section}</Badge>}
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setProfileOpen(s)}>
                <UserIcon className="h-3.5 w-3.5 mr-1.5" /> Profile
              </Button>
              <Button size="sm" className="w-full relative" onClick={() => setChatOpen(s)}>
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Message
                {unreadFrom[s.user_id] > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground">
                    {unreadFrom[s.user_id]}
                  </span>
                )}
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-12">No students found.</p>
        )}
      </div>

      {/* PROFILE MODAL */}
      <Dialog open={!!profileOpen} onOpenChange={(v) => !v && setProfileOpen(null)}>
        <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden animate-scale-in">
          {profileOpen && (
            <>
              <div className="bg-gradient-to-br from-primary/20 via-purple-500/15 to-transparent p-5 border-b border-border">
                <DialogTitle className="sr-only">{profileOpen.full_name}</DialogTitle>
                <DialogDescription className="sr-only">Student profile details</DialogDescription>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-xl shadow-glow">
                    {profileOpen.full_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-lg font-bold truncate">{profileOpen.full_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{profileOpen.roll_number}</div>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-2 text-sm max-h-[60vh] overflow-y-auto">
                <Field icon={<Hash className="h-4 w-4" />} label="Roll No" value={profileOpen.roll_number} />
                <Field icon={<MapPin className="h-4 w-4" />} label="Section" value={profileOpen.section} />
                <Field icon={<BookOpen className="h-4 w-4" />} label="Course" value={profileOpen.course ?? "B.Tech"} />
                <Field icon={<GraduationCap className="h-4 w-4" />} label="Branch" value={profileOpen.branch} />
                <Field icon={<Calendar className="h-4 w-4" />} label="Year / Sem" value={[profileOpen.year, profileOpen.semester && `Sem ${profileOpen.semester}`].filter(Boolean).join(" • ") || null} />
                <Field icon={<Phone className="h-4 w-4" />} label="Mobile" value={profileOpen.phone} />
                <Field icon={<Mail className="h-4 w-4" />} label="Email" value={profileOpen.email} />
                <Field icon={<Calendar className="h-4 w-4" />} label="Date of Birth" value={profileOpen.dob} />
              </div>
              <div className="p-3 border-t border-border flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setProfileOpen(null)}>Close</Button>
                <Button size="sm" onClick={() => { const s = profileOpen; setProfileOpen(null); setChatOpen(s); }}>
                  <MessageCircle className="h-4 w-4 mr-1.5" /> Message
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CHAT POPUP */}
      <Dialog open={!!chatOpen} onOpenChange={(v) => !v && setChatOpen(null)}>
        <DialogContent className="glass-strong sm:max-w-md p-0 overflow-hidden h-[85vh] sm:h-[600px] flex flex-col animate-slide-up">
          {chatOpen && (
            <>
              <div className="flex items-center gap-3 p-3 border-b border-border bg-gradient-to-r from-primary/15 to-purple-500/10">
                <div className="h-9 w-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {chatOpen.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-sm font-semibold truncate">{chatOpen.full_name}</DialogTitle>
                  <DialogDescription className="text-[11px] text-muted-foreground font-mono truncate">
                    {chatOpen.roll_number}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Start the conversation.</p>
                ) : messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                        <div>{m.message}</div>
                        <div className={`text-[10px] mt-0.5 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="p-2 border-t border-border flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Type a message…"
                  autoFocus
                />
                <Button size="sm" onClick={send} disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </>
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
