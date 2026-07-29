import { useEffect, useState } from "react";
import { supabase } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2 } from "lucide-react";

export const AnnouncementsAdmin = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");

  const refresh = () => supabase.from("announcements").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!title || !body) { toast.error("Title and body required"); return; }
    const { error } = await supabase.from("announcements").insert({ title, body, category, created_by: user?.id ?? null });
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement posted");
    setOpen(false); setTitle(""); setBody(""); refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Announcements</h1><p className="text-muted-foreground">Post notices for everyone</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
              <div><Label>Body</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
              <Button className="w-full" onClick={submit}>Post</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {list.map((a) => (
          <Card key={a.id} className="glass-card p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  {a.category && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{a.category}</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
        {list.length === 0 && <p className="text-center text-muted-foreground py-8">No announcements yet.</p>}
      </div>
    </div>
  );
};
