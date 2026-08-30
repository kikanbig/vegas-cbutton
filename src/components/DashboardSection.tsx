import dashboardMockup from "@/assets/dashboard-mockup.png";

const DashboardSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-6xl text-center">
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
        Панель управления PLS
      </h2>
      <p className="text-xl text-muted-foreground mb-6">
        (Vegas)
      </p>
      <p className="text-2xl text-foreground font-medium mb-14">
        Полная прозрачность воронки продаж
      </p>
      <div className="rounded-3xl overflow-hidden shadow-2xl border border-border/50">
        <img
          src={dashboardMockup}
          alt="Vegas Dashboard — аналитика трафика, эффективность команды, воронка продаж"
          className="w-full"
        />
      </div>
    </div>
  </section>
);

export default DashboardSection;
