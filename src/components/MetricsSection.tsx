const metrics = [
  {
    title: "Эффективность Маркетинга",
    from: "Входящий Трафик",
    to: "Целевой Посетитель",
    question: "Привёл ли маркетинг нужных людей?",
  },
  {
    title: "Эффективность Продаж",
    from: "Целевой Посетитель",
    to: "Потенциальный Покупатель",
    question: "Смог ли продавец заинтересовать?",
  },
  {
    title: "Эффективность Продукта",
    from: "Потенциальный Покупатель",
    to: "Чек",
    question: "Устроила ли цена и товар?",
  },
];

const MetricsSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-5xl">
      <h2 className="text-4xl md:text-5xl font-black text-center mb-6 leading-tight">
        Разделите ответственность маркетинга и продаж.
      </h2>
      <p className="text-center text-xl text-muted-foreground mb-14 max-w-2xl mx-auto">
        Старая «Конверсия» (Покупки / Трафик) — это ложь. Новая формула:
      </p>
      <div className="space-y-5">
        {metrics.map((m) => (
          <div key={m.title} className="card-glass overflow-hidden">
            <div className="bg-primary text-primary-foreground px-8 py-4">
              <h3 className="text-xl md:text-2xl font-bold">{m.title}</h3>
            </div>
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-3 text-foreground">
                <span className="text-base md:text-xl font-semibold">{m.from}</span>
                <span className="text-xl md:text-2xl text-accent font-bold">→</span>
                <span className="text-base md:text-xl font-semibold">{m.to}</span>
              </div>
              <p className="text-base md:text-lg text-muted-foreground">{m.question}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default MetricsSection;
