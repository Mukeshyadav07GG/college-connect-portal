import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FacultyRow {
  id: string;
  name: string;
  role: string | null;
  subjects: string[] | null;
  description: string | null;
}

interface ChatMsg {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
}

export const FacultyDirectory = () => {
  const [list, setList] = useState<FacultyRow[]>([]);
  const [aboutOpen, setAboutOpen] = useState<FacultyRow | null>(null);
  const [chatOpen, setChatOpen] = useState<FacultyRow | null>(null);

  useEffect(() => {
    supabase.from("faculty").select("*").order("name").then(({ data }) => setList(data ?? []));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Faculty Directory</h1>
        <p className="text-muted-foreground text-sm">View profiles or message your professors directly.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map((f, i) => (
          <div key={f.id} className="glass rounded-2xl p-5 hover-lift animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
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
              <Button size="sm" onClick={() => setChatOpen(f)} className="glow-button text-xs h-8">
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

      {/* Chat modal */}
      <ChatDialog faculty={chatOpen} onClose={() => setChatOpen(null)} />
    </div>
  );
};

const ChatDialog = ({ faculty, onClose }: { faculty: FacultyRow | null; onClose: () => void }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Demo: faculty doesn't have a user account yet, so chat is local-state only.
  // In production, faculty would have auth users and we'd query chat_messages.

  const send = async () => {
    if (!text.trim() || !user || !faculty) return;
    setSending(true);
    try {
      // Note: demo faculty entries don't have user accounts.
      // We log the intent and add to local UI. Real chat works between authenticated users.
      const newMsg: ChatMsg = {
        id: crypto.randomUUID(),
        sender_id: user.id,
        recipient_id: faculty.id,
        message: text,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, newMsg]);
      setText("");
      toast.success("Message sent (demo mode — faculty accounts coming in Phase 3)");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!faculty} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-w-md p-0 overflow-hidden">
        {faculty && (
          <>
            <div className="bg-gradient-hero p-4 text-primary-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {faculty.name.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-base font-display">{faculty.name}</DialogTitle>
                <p className="text-xs opacity-90">{faculty.role}</p>
              </div>
            </div>
            <div className="h-72 p-4 overflow-y-auto bg-muted/20 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12">
                  Start a conversation with {faculty.name.split(" ")[0]}
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                      m.sender_id === user?.id ? "gradient-bg text-primary-foreground" : "glass"
                    }`}>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1"
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
