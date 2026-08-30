const FAQSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-5xl">
      <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
        «А разве это не субъективно?»
      </h2>
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="flex justify-center">
          <span className="text-[12rem] md:text-[16rem] text-muted/50 font-black leading-none select-none">?</span>
        </div>
        <div className="card-glass p-10 space-y-8">
          <p className="text-2xl font-black text-foreground">Да. И в этом сила.</p>
          <div className="space-y-5">
            <div className="flex gap-4 items-start">
              <span className="text-xl">👤</span>
              <p className="text-lg text-foreground">Мы возвращаем «человеческий фактор» в аналитику.</p>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-xl">👁️</span>
              <p className="text-lg text-foreground">Машинное зрение видит объекты. Продавец видит людей.</p>
            </div>
            <div className="flex gap-4 items-start">
              <span className="text-xl">🔄</span>
              <p className="text-lg text-foreground">Если продавец ошибается — это тоже данные для обучения и коррекции.</p>
            </div>
          </div>
          <p className="text-xl text-accent font-bold italic">
            Это не контроль. Это инструмент доверия.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default FAQSection;
