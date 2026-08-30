const stages = [
  {
    title: "Посетители",
    hint: "Весь трафик",
    text: "Счётчик на входе. Все, кто зашёл в салон: целевые гости, прохожие, «погреться», спросить дорогу.",
  },
  {
    title: "Целевой трафик",
    hint: "Кнопка контакта",
    text: "Вы нажали кнопку. Это люди, которых вы признали целевыми: им нужен матрас, они готовы говорить.",
  },
  {
    title: "Консультации",
    hint: "Целевой трафик консультаций",
    text: "Разговор состоялся и зафиксирован. Дальше видно, чем он закончился: КП, проект или отказ.",
  },
];

const metrics = [
  {
    title: "Эффективность маркетинга",
    from: "Посетители",
    to: "Целевой трафик",
    question: "Привёл ли маркетинг нужных людей?",
  },
  {
    title: "Эффективность продаж",
    from: "Целевой трафик",
    to: "Консультация",
    question: "Смог ли продавец заинтересовать и провести разговор?",
  },
  {
    title: "Эффективность продукта",
    from: "Консультация",
    to: "Чек",
    question: "Устроили ли цена и товар?",
  },
];

const MetricsSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-5xl">
      <h2 className="text-3xl md:text-5xl font-black text-center mb-6 leading-tight">
        Воронка, которую мы считаем
      </h2>
      <p className="text-center text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
        Старая «конверсия» — покупки делить на весь трафик — врёт.
        Она смешивает маркетинг, зал и товар. Кнопка разделяет этапы.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mb-14">
        {stages.map((stage, i) => (
          <div key={stage.title} className="card-glass p-6 space-y-3 relative">
            <p className="text-primary font-extrabold text-sm tracking-wide">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="text-2xl font-black">{stage.title}</h3>
            <p className="text-accent font-semibold">{stage.hint}</p>
            <p className="text-muted-foreground leading-relaxed">{stage.text}</p>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {metrics.map((m) => (
          <div key={m.title} className="card-glass overflow-hidden">
            <div className="bg-primary text-primary-foreground px-6 md:px-8 py-4">
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
