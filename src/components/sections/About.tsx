import { Award, Target, Eye, Trophy } from "lucide-react";

const ACHIEVEMENTS = [
  { icon: Award, title: "AKTU Topper 2023", desc: "Three students secured ranks in AKTU university toppers list." },
  { icon: Trophy, title: "Smart India Hackathon", desc: "Winners — National finalists for two consecutive years (2023, 2024)." },
  { icon: Target, title: "100+ Patents", desc: "Faculty and student patents filed in emerging technology domains." },
  { icon: Eye, title: "NAAC A Grade", desc: "Reaccredited with A grade for academic excellence and infrastructure." },
];

export const About = () => {
  return (
    <section id="about" className="py-24 relative">
      <div className="container">
        <div className="text-center mb-14">
          <div className="inline-block glass px-4 py-1 rounded-full text-xs font-medium text-primary mb-4">ABOUT KNMIET</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            A legacy of <span className="gradient-text">academic excellence</span>
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            Established in 1998 in the heart of Modinagar, Ghaziabad (Uttar Pradesh – 201204), Dr. K.N. Modi Institute of Engineering and Technology has been at the forefront of technical education in North India. Affiliated to Dr. A.P.J. Abdul Kalam Technical University (AKTU) and approved by AICTE, we offer industry-relevant programs in engineering, management and computer applications.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACHIEVEMENTS.map((a, i) => (
            <div key={a.title} className="glass rounded-2xl p-6 hover-lift hover-glow group animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-glow">
                <a.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg mb-1">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
