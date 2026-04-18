import * as Icons from "lucide-react";
import { CAMPUS_FACILITIES } from "@/data/courses";

export const CampusLife = () => {
  return (
    <section id="campus" className="py-24 relative">
      <div className="container">
        <div className="text-center mb-14">
          <div className="inline-block glass px-4 py-1 rounded-full text-xs font-medium text-primary mb-4">CAMPUS LIFE</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            More than just <span className="gradient-text">classrooms</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Spread across acres of green campus, our facilities are designed to foster learning, sports and creativity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CAMPUS_FACILITIES.map((f, i) => {
            const Icon = (Icons as any)[f.icon] ?? Icons.Sparkles;
            return (
              <div key={f.title} className="glass rounded-2xl p-5 hover-lift group animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
