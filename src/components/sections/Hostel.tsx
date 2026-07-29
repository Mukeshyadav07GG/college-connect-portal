import { useEffect, useState } from "react";
import { Check, Image as ImageIcon } from "lucide-react";
import { HOSTEL_FACILITIES } from "@/data/courses";
import { supabase } from "@/lib/api/client";

export const Hostel = () => {
  const [images, setImages] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);

  useEffect(() => {
    supabase.from("hostel_images").select("id, image_url, caption").order("created_at", { ascending: false })
      .then(({ data }) => setImages(data ?? []));
  }, []);

  return (
    <section id="hostel" className="py-24 relative">
      <div className="container">
        <div className="text-center mb-14">
          <div className="inline-block glass px-4 py-1 rounded-full text-xs font-medium text-primary mb-4">RESIDENTIAL LIFE</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            A second <span className="gradient-text">home on campus</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="glass rounded-3xl p-7">
            <h3 className="font-display text-xl font-bold mb-4">Hostel Facilities</h3>
            <ul className="space-y-3">
              {HOSTEL_FACILITIES.map((f, i) => (
                <li key={i} className="flex items-start gap-3 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="w-5 h-5 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-3xl p-7">
            <h3 className="font-display text-xl font-bold mb-4">Gallery</h3>
            {images.length === 0 ? (
              <div className="aspect-video rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No hostel images yet</p>
                <p className="text-xs mt-1">Admins can upload from the admin panel</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {images.slice(0, 6).map((img) => (
                  <div key={img.id} className="aspect-square rounded-xl overflow-hidden hover-lift">
                    <img src={img.image_url} alt={img.caption ?? "Hostel"} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
