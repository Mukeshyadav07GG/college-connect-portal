import { Phone, Mail, MapPin, Globe } from "lucide-react";

const CONTACTS = [
  { icon: MapPin, label: "Address", value: "NH-58, Modinagar, Ghaziabad, Uttar Pradesh – 201204", href: "https://maps.google.com/?q=Dr+KN+Modi+Institute+Modinagar" },
  { icon: Phone, label: "Phone", value: "+91 1232 244 723", href: "tel:+911232244723" },
  { icon: Mail, label: "Email", value: "info@knmiet.ac.in", href: "mailto:info@knmiet.ac.in" },
  { icon: Globe, label: "Website", value: "www.knmiet.ac.in", href: "https://www.knmiet.ac.in" },
];

export const Contact = () => {
  return (
    <section id="contact" className="py-24 relative">
      <div className="container">
        <div className="text-center mb-14">
          <div className="inline-block glass px-4 py-1 rounded-full text-xs font-medium text-primary mb-4">GET IN TOUCH</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Visit <span className="gradient-text">our campus</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CONTACTS.map((c, i) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="glass rounded-2xl p-6 hover-lift hover-glow group text-center animate-slide-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-glow">
                <c.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{c.label}</div>
              <div className="font-medium text-sm break-words">{c.value}</div>
            </a>
          ))}
        </div>

        <footer className="mt-20 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Dr. K.N. Modi Institute of Engineering & Technology, Modinagar. All rights reserved.</p>
          <p className="mt-1 text-xs">Affiliated to Dr. A.P.J. Abdul Kalam Technical University, Lucknow</p>
        </footer>
      </div>
    </section>
  );
};
