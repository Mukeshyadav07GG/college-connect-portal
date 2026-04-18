import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Courses } from "@/components/sections/Courses";
import { CampusLife } from "@/components/sections/CampusLife";
import { Hostel } from "@/components/sections/Hostel";
import { AcademicCalendar } from "@/components/sections/AcademicCalendar";
import { Contact } from "@/components/sections/Contact";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
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
    </main>
  );
};

export default Index;
