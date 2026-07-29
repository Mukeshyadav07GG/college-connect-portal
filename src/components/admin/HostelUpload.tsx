import { useEffect, useState } from "react";
import { supabase } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const HostelUpload = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => supabase.from("hostel_images").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!file || !user) { toast.error("Pick an image"); return; }
    setBusy(true);
    const path = `${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("hostel-images").upload(path, file);
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const { data: pub } = supabase.storage.from("hostel-images").getPublicUrl(path);
    const { error } = await supabase.from("hostel_images").insert({ image_url: pub.publicUrl, caption, uploaded_by: user.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Image uploaded");
    setOpen(false); setFile(null); setCaption(""); refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("hostel_images").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Hostel Gallery</h1><p className="text-muted-foreground">Manage hostel images</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Upload className="h-4 w-4 mr-1" /> Upload</Button></DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader><DialogTitle>Upload Hostel Image</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Image</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <div><Label>Caption</Label><Input value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
              <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {list.map((img) => (
          <Card key={img.id} className="glass-card overflow-hidden group relative">
            <img src={img.image_url} alt={img.caption ?? "Hostel"} className="w-full h-40 object-cover" />
            {img.caption && <p className="p-2 text-xs">{img.caption}</p>}
            <Button variant="destructive" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={() => remove(img.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        {list.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No images yet.</p>}
      </div>
    </div>
  );
};
