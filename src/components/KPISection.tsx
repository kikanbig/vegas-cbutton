import salesConsultant from "@/assets/sales-consultant.png";

const points = [
  { bold: "Не каждый вошедший — клиент.", text: "Кто-то зашёл погреться, кто-то спросить дорогу." },
  { bold: "Перестаньте наказывать", text: "продавцов за низкую конверсию на «пустом» трафике." },
  { bold: "Честная оценка труда =", text: "Рост мотивации персонала." },
  { bold: "Продавец сам определяет,", text: "кто его клиент." },
];

const KPISection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-6xl">
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-center mb-16">
        Справедливый KPI для команды.
      </h2>
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <img
            src={salesConsultant}
            alt="Продавец-консультант"
            className="w-full max-w-md rounded-3xl shadow-2xl mx-auto"
          />
        </div>
        <div className="card-glass p-10 space-y-7">
          {points.map((p, i) => (
            <div key={i} className="flex gap-4 items-start">
              <span className="text-accent text-2xl mt-0.5">✓</span>
              <p className="text-lg text-foreground leading-relaxed">
                <strong className="text-accent">{p.bold}</strong>{" "}
                {p.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default KPISection;
