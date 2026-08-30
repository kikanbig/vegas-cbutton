import buttonOnDesk from "@/assets/button-on-desk.png";

const features = [
  { title: "Мобильное приложение", desc: "Кнопка контакта прямо в смартфоне продавца." },
  { title: "Мгновенный запуск", desc: "Установка за 5 минут — скачал и работай." },
  { title: "Без оборудования", desc: "Никакого монтажа и проводов." },
  { title: "Интуитивный UX", desc: "Одно нажатие — контакт зафиксирован." },
];

const ImplementationSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-6xl">
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-center mb-16">
        Простота внедрения.
      </h2>
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="flex justify-center">
          <img
            src={buttonOnDesk}
            alt="Кнопка контакта в мобильном приложении"
            className="w-full max-w-md rounded-3xl shadow-2xl"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f) => (
            <div key={f.title} className="card-glass p-5 md:p-6 space-y-2">
              <h3 className="text-lg md:text-xl font-bold text-foreground">{f.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ImplementationSection;
