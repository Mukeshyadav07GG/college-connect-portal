import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-campus.jpg";

export const Hero = () => {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={heroImg} alt="KNMIET Modinagar campus at golden hour" width={1920} height={1080} fetchPriority="high" decoding="async" className="w-full h-full object-cover opacity-30 dark:opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-background" />
      </div>

      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">AKTU Affiliated · NAAC Accredited · Estd. 1998</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6 animate-slide-up">
            Dr. K.N. Modi Institute of <br />
            <span className="gradient-text">Engineering & Technology</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "100ms" }}>
            Shaping tomorrow's engineers, managers and technologists in the heart of Modinagar, Ghaziabad. Industry-aligned curriculum, world-class infrastructure, and a thriving campus life.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 animate-scale-in" style={{ animationDelay: "200ms" }}>
            <Button size="lg" onClick={() => scrollTo("courses")} className="glow-button h-12 px-7 text-base">
              Explore Courses <ArrowRight className="ml-1.5 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => scrollTo("about")} className="h-12 px-7 text-base glass">
              Learn More
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {[
              { v: "25+", l: "Years of Excellence" },
              { v: "5000+", l: "Alumni Network" },
              { v: "120+", l: "Faculty Members" },
              { v: "95%", l: "Placement Rate" },
            ].map((s, i) => (
              <div key={s.l} className="glass rounded-2xl p-4 hover-lift animate-slide-up" style={{ animationDelay: `${300 + i * 80}ms` }}>
                <div className="text-2xl md:text-3xl font-display font-bold gradient-text">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
