import { useEffect, useState } from "react";
import { supabase } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, MapPin } from "lucide-react";

export const EventsAdmin = () => {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Academic");

  const refresh = () => supabase.from("events").select("*").order("event_date", { ascending: false }).then(({ data }) => setList(data ?? []));
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!title || !eventDate) { toast.error("Title and date required"); return; }
    const { error } = await supabase.from("events").insert({ title, description, event_date: eventDate, location, category });
    if (error) { toast.error(error.message); return; }
    toast.success("Event added");
    setOpen(false); setTitle(""); setDescription(""); setEventDate(""); setLocation(""); refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Events</h1><p className="text-muted-foreground">Manage academic calendar events</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Event</Button></DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Date</Label><Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div>
                <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
              </div>
              <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
              <Button className="w-full" onClick={submit}>Add Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {list.map((e) => (
          <Card key={e.id} className="glass-card p-4 flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{e.title}</h3>
                {e.category && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{e.category}</span>}
              </div>
              {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(e.event_date).toLocaleDateString()}</span>
                {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
        {list.length === 0 && <p className="text-center text-muted-foreground py-8">No events yet.</p>}
      </div>
    </div>
  );
};
