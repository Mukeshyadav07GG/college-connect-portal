import { lazy, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/sections/Hero";

const About = lazy(() => import("@/components/sections/About").then(m => ({ default: m.About })));
const Courses = lazy(() => import("@/components/sections/Courses").then(m => ({ default: m.Courses })));
const CampusLife = lazy(() => import("@/components/sections/CampusLife").then(m => ({ default: m.CampusLife })));
const Hostel = lazy(() => import("@/components/sections/Hostel").then(m => ({ default: m.Hostel })));
const AcademicCalendar = lazy(() => import("@/components/sections/AcademicCalendar").then(m => ({ default: m.AcademicCalendar })));
const Contact = lazy(() => import("@/components/sections/Contact").then(m => ({ default: m.Contact })));

const SectionFallback = () => <div className="py-24" aria-hidden />;

const Index = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Suspense fallback={<SectionFallback />}>
        <About />
        <Courses />
        <CampusLife />
        <Hostel />
        <section id="calendar" className="py-24">
          <div className="container">
            <div className="text-center mb-14">
              <div className="inline-block glass px-4 py-1 rounded-full text-xs font-medium text-primary mb-4">ACADEMIC CALENDAR</div>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Stay <span className="gradient-text">on schedule</span>
              </h2>
            </div>
            <AcademicCalendar embedded />
          </div>
        </section>
        <Contact />
      </Suspense>
    </main>
  );
};

export default Index;
