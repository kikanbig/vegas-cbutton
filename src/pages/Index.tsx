import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import MetricsSection from "@/components/MetricsSection";
import KPISection from "@/components/KPISection";
import ImplementationSection from "@/components/ImplementationSection";
import DashboardSection from "@/components/DashboardSection";
import AudienceSection from "@/components/AudienceSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";

const Index = () => (
  <main className="min-h-screen bg-background">
    <Header />
    <div className="pt-16">
      <HeroSection />
    <ProblemSection />
    <SolutionSection />
    <HowItWorksSection />
    <MetricsSection />
    <KPISection />
    <ImplementationSection />
    <DashboardSection />
    <AudienceSection />
    <FAQSection />
    <CTASection />
    </div>
  </main>
);

export default Index;
