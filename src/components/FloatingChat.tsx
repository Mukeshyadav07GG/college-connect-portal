import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Profile { user_id: string; full_name: string; }
interface Message { id: string; sender_id: string; recipient_id: string; message: string; created_at: string; read: boolean | null; }

export const FloatingChat = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [active, setActive] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_profile_directory").then(({ data }) => {
      const list = ((data as any[]) ?? []).filter((p) => p.user_id !== user.id);
      setContacts(list as Profile[]);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === user.id || msg.recipient_id === user.id) {
          if (active && (msg.sender_id === active.user_id || msg.recipient_id === active.user_id)) {
            setMessages((prev) => [...prev, msg]);
          } else if (msg.recipient_id === user.id) {
            setUnread((u) => u + 1);
            const sender = contacts.find((c) => c.user_id === msg.sender_id);
            toast.message(sender?.full_name ?? "New message", { description: msg.message });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, active, contacts]);

  useEffect(() => {
    if (!user || !active) return;
    supabase
      .from("chat_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.user_id}),and(sender_id.eq.${active.user_id},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) ?? []));
  }, [user, active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!user || !active || !text.trim()) return;
    const { error } = await supabase.from("chat_messages").insert({
      sender_id: user.id, recipient_id: active.user_id, message: text.trim(),
    });
    if (error) toast.error(error.message);
    else setText("");
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => { setOpen((o) => !o); setUnread(0); }}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-purple-600 shadow-glow flex items-center justify-center text-primary-foreground hover:scale-110 transition-transform"
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs flex items-center justify-center text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[500px] glass-card rounded-2xl flex flex-col overflow-hidden border border-border shadow-2xl">
          <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/10 to-purple-500/10">
            <div className="font-semibold text-sm">
              {active ? active.full_name : "Messages"}
            </div>
            <div className="flex gap-1">
              {active && <Button size="sm" variant="ghost" onClick={() => setActive(null)}>Back</Button>}
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
          </div>

          {!active ? (
            <div className="flex-1 overflow-y-auto p-2">
              {contacts.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">No contacts yet.</p>}
              {contacts.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() => setActive(c)}
                  className="w-full text-left p-3 hover:bg-accent rounded-lg flex items-center gap-3"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    {c.full_name?.charAt(0)}
                  </div>
                  <span className="text-sm">{c.full_name}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender_id === user.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
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
            </>
          )}
        </div>
      )}
    </>
  );
};
