import stepEntrance from "@/assets/step-entrance.png";
import stepContact from "@/assets/step-contact.png";
import handPressing from "@/assets/hand-pressing-button.png";
import stepResult from "@/assets/step-result.png";

const steps = [
  {
    image: stepEntrance,
    num: "1",
    title: "Вход.",
    description: "Посетитель заходит в салон. Счётчик фиксирует трафик.",
  },
  {
    image: stepContact,
    num: "2",
    title: "Контакт.",
    description: "Продавец вступает в диалог и проводит квалификацию.",
  },
  {
    image: handPressing,
    num: "3",
    title: "Кнопка.",
    description: "Если это Целевой Посетитель (ЦП) — продавец нажимает кнопку.",
    highlighted: true,
  },
  {
    image: stepResult,
    num: "4",
    title: "Результат.",
    description: "Система фиксирует «Лид» и начинает расчёт истинной конверсии.",
  },
];

const HowItWorksSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-7xl">
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-center mb-16">
        Как это работает
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className={`card-glass overflow-hidden transition-transform hover:-translate-y-2 ${
              step.highlighted ? "ring-3 ring-accent" : ""
            }`}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={step.image}
                alt={step.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-2">
              <h3 className="text-2xl font-black">
                <span className="text-accent">{step.num}.</span> {step.title}
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
