import blackBox from "@/assets/black-box.png";
import problemTraffic from "@/assets/problem-traffic.png";
import problemSales from "@/assets/problem-sales.png";
import { ArrowRight } from "lucide-react";

const ProblemSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-6xl">
      <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-center mb-6">
        Проблема
      </h2>
      <p className="text-2xl md:text-3xl font-bold text-center text-accent mb-20">
        «Чёрный ящик» ритейла
      </p>

      {/* Flow diagram */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 md:gap-6 mb-20">
        {/* Traffic */}
        <div className="flex flex-col items-center text-center space-y-5 flex-1">
          <div className="w-56 md:w-64 aspect-[4/3] rounded-2xl overflow-hidden">
            <img
              src={problemTraffic}
              alt="Трафик покупателей"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-2xl md:text-3xl font-black text-foreground">
            Трафик
          </p>
          <p className="text-lg text-muted-foreground font-medium">(Вход)</p>
        </div>

        {/* Arrow */}
        <ArrowRight className="hidden md:block w-10 h-10 text-muted-foreground shrink-0 mt-20" />
        <ArrowRight className="md:hidden w-8 h-8 text-muted-foreground rotate-90 shrink-0" />

        {/* Black Box */}
        <div className="flex flex-col items-center text-center space-y-5 flex-1">
          <div className="w-56 md:w-64 aspect-[4/3] rounded-2xl overflow-hidden">
            <img
              src={blackBox}
              alt="Чёрный ящик"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-2xl md:text-3xl font-black text-foreground">
            ЧЁРНЫЙ ЯЩИК
          </p>
          <p className="text-lg text-transparent font-medium select-none" aria-hidden="true">&nbsp;</p>
        </div>

        {/* Arrow */}
        <ArrowRight className="hidden md:block w-10 h-10 text-muted-foreground shrink-0 mt-20" />
        <ArrowRight className="md:hidden w-8 h-8 text-muted-foreground rotate-90 shrink-0" />

        {/* Sales */}
        <div className="flex flex-col items-center text-center space-y-5 flex-1">
          <div className="w-56 md:w-64 aspect-[4/3] rounded-2xl overflow-hidden">
            <img
              src={problemSales}
              alt="Продажи"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-2xl md:text-3xl font-black text-foreground">
            Продажи
          </p>
          <p className="text-lg text-muted-foreground font-medium">(Выход)</p>
        </div>
      </div>

      {/* Key insight */}
      <div className="border border-border rounded-2xl p-10 md:p-14 text-center max-w-4xl mx-auto">
        <p className="text-3xl md:text-4xl font-black text-foreground mb-6 leading-tight">
          Высокий трафик + Низкие продажи
          <br />
          <span className="text-accent">≠ Плохие продавцы.</span>
        </p>
        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
          Часто это означает{" "}
          <strong className="text-foreground">«нецелевой трафик»</strong>. Вы не
          можете управлять тем, что не можете измерить.
        </p>
        <p className="text-2xl md:text-3xl font-black text-foreground mt-8">
          Без данных о контакте — вы слепы.
        </p>
      </div>
    </div>
  </section>
);

export default ProblemSection;
