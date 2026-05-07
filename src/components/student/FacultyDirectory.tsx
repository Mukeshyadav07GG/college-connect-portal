import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Info, MessageSquare, Send, Loader2, Search, Mail, Phone, DoorOpen, Clock, GraduationCap, Briefcase, BookOpen, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FacultyCard {
  // Faculty directory metadata
  id: string;             // faculty table row id
  name: string;
  role: string | null;
  subjects: string[] | null;
  description: string | null;
  experience: string | null;
  qualification: string | null;
  contact_email: string | null;
  mobile: string | null;
  room_no: string | null;
  available_time: string | null;
  email: string | null;
  // Linked auth profile (so we can chat with them)
  user_id: string | null;
  employee_id: string | null;
}

interface ChatMsg {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
}

export const FacultyDirectory = () => {
  const { user } = useAuth();
  const [list, setList] = useState<FacultyCard[]>([]);
  const [search, setSearch] = useState("");
  const [aboutOpen, setAboutOpen] = useState<FacultyCard | null>(null);
  const [chatOpen, setChatOpen] = useState<FacultyCard | null>(null);
  const [unreadFrom, setUnreadFrom] = useState<Record<string, number>>({});

  // Load faculty directory + match each row to their auth profile by name (case-insensitive),
  // since `faculty` rows aren't yet linked by employee_id.
  useEffect(() => {
    (async () => {
      const [{ data: facs }, { data: profs }] = await Promise.all([
        supabase.from("faculty").select("*").order("name"),
        supabase.rpc("get_profile_directory"),
      ]);
      const profsFiltered = ((profs as any[]) ?? []).filter((p) => p.employee_id);
      const byName = new Map<string, { user_id: string; employee_id: string | null }>();
      profsFiltered.forEach((p: any) => {
        if (p.full_name) byName.set(p.full_name.trim().toLowerCase(), { user_id: p.user_id, employee_id: p.employee_id });
      });
      const merged: FacultyCard[] = (facs ?? []).map((f: any) => {
        const match = byName.get((f.name ?? "").trim().toLowerCase());
        return {
          id: f.id,
          name: f.name,
          role: f.role,
          subjects: f.subjects,
          description: f.description,
          user_id: match?.user_id ?? null,
          employee_id: match?.employee_id ?? null,
        };
      });
      setList(merged);
    })();
  }, []);

  // Inbox: unread counts from each faculty user_id
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
      .channel("student-faculty-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const msg = payload.new as ChatMsg;
          if (chatOpen?.user_id && msg.sender_id === chatOpen.user_id) return; // chat dialog handles it
          setUnreadFrom((u) => ({ ...u, [msg.sender_id]: (u[msg.sender_id] ?? 0) + 1 }));
          const sender = list.find((f) => f.user_id === msg.sender_id);
          toast.message(sender?.name ?? "New message", { description: msg.message });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, chatOpen, list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((f) =>
      [f.name, f.role, ...(f.subjects ?? [])].some((v) => v?.toLowerCase().includes(q))
    );
  }, [list, search]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Faculty Directory</h1>
          <p className="text-muted-foreground text-sm">View profiles or chat with your professors in real time.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, subject…" className="pl-9" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((f, i) => (
          <div key={f.id} className="glass rounded-2xl p-5 hover-lift animate-slide-up relative" style={{ animationDelay: `${i * 50}ms` }}>
            {f.user_id && unreadFrom[f.user_id] > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground animate-pulse">
                {unreadFrom[f.user_id]}
              </Badge>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold shadow-glow">
                {f.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-sm truncate">{f.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{f.role ?? "Faculty"}</div>
              </div>
            </div>
            {f.subjects && f.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {f.subjects.map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">{s}</span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => setAboutOpen(f)} className="text-xs h-8">
                <Info className="w-3 h-3 mr-1" /> About
              </Button>
              <Button
                size="sm"
                onClick={() => setChatOpen(f)}
                className="glow-button text-xs h-8"
                disabled={!f.user_id}
                title={f.user_id ? "" : "No login account for this faculty yet"}
              >
                <MessageSquare className="w-3 h-3 mr-1" /> Message
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* About modal */}
      <Dialog open={!!aboutOpen} onOpenChange={(v) => !v && setAboutOpen(null)}>
        <DialogContent className="glass-strong max-w-md">
          {aboutOpen && (
            <>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-glow">
                  {aboutOpen.name.charAt(0)}
                </div>
                <div>
                  <DialogTitle className="font-display text-xl">{aboutOpen.name}</DialogTitle>
                  <p className="text-sm text-primary font-medium">{aboutOpen.role}</p>
                </div>
              </div>
              <DialogDescription className="space-y-3 text-foreground">
                {aboutOpen.subjects && aboutOpen.subjects.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Teaches</div>
                    <div className="flex flex-wrap gap-1.5">
                      {aboutOpen.subjects.map((s) => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-mono font-bold">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {aboutOpen.description && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">About</div>
                    <p className="text-sm leading-relaxed">{aboutOpen.description}</p>
                  </div>
                )}
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ChatDialog
        faculty={chatOpen}
        onClose={() => setChatOpen(null)}
        onMessageRead={(uid) => setUnreadFrom((u) => ({ ...u, [uid]: 0 }))}
      />
    </div>
  );
};

const ChatDialog = ({
  faculty, onClose, onMessageRead,
}: { faculty: FacultyCard | null; onClose: () => void; onMessageRead: (uid: string) => void }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load conversation + mark incoming as read
  useEffect(() => {
    if (!user || !faculty?.user_id) { setMessages([]); return; }
    const peer = faculty.user_id;
    supabase
      .from("chat_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as ChatMsg[]) ?? []));
    supabase.from("chat_messages").update({ read: true })
      .eq("sender_id", peer).eq("recipient_id", user.id).eq("read", false)
      .then(() => onMessageRead(peer));
  }, [user, faculty?.user_id]);

  // Realtime: append new messages from this peer
  useEffect(() => {
    if (!user || !faculty?.user_id) return;
    const peer = faculty.user_id;
    const channel = supabase
      .channel(`chat-${user.id}-${peer}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const msg = payload.new as ChatMsg;
          if (msg.sender_id === peer) {
            setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
            supabase.from("chat_messages").update({ read: true }).eq("id", msg.id).then(() => {});
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, faculty?.user_id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!user || !faculty?.user_id || !text.trim()) return;
    const body = text.trim();
    setText("");
    setSending(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ sender_id: user.id, recipient_id: faculty.user_id, message: body })
      .select()
      .single();
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setMessages((m) => [...m, data as ChatMsg]);
  };

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={!!faculty} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-w-md p-0 overflow-hidden h-[85vh] sm:h-[600px] flex flex-col">
        {faculty && (
          <>
            <div className="bg-gradient-hero p-4 text-primary-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {faculty.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-display truncate">{faculty.name}</DialogTitle>
                <DialogDescription className="text-xs opacity-90 truncate">{faculty.role}</DialogDescription>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-muted/20 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12">
                  Start a conversation with {faculty.name.split(" ")[0]}
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                        <div>{m.message}</div>
                        <div className={`text-[10px] mt-0.5 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{fmt(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1"
                autoFocus
              />
              <Button onClick={send} disabled={sending || !text.trim()} size="icon" className="glow-button">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
