import handPressing from "@/assets/hand-pressing-button.png";

const SolutionSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-6xl">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="flex justify-center">
          <img
            src={handPressing}
            alt="Нажатие кнопки контакта"
            className="w-full max-w-md rounded-3xl shadow-2xl"
          />
        </div>
        <div className="card-glass p-10 md:p-12 space-y-8">
          <h2 className="text-4xl md:text-5xl font-black leading-tight">
            Решение:<br />Кнопка контакта
          </h2>
          <p className="text-xl font-semibold text-foreground">
            Цифровизация интуиции продавца.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Это кнопка, которую продавец нажимает только тогда, когда идентифицирует посетителя как «Целевого» (ЦП).
          </p>
          <blockquote className="border-l-4 border-accent pl-6 italic text-xl text-foreground font-medium">
            «Доверяй охотнику, а не просто следи за добычей».
          </blockquote>
          <div className="flex items-center gap-3">
            <span className="text-accent text-2xl">✓</span>
            <span className="text-lg font-medium text-foreground">Никаких камер. Никакой слежки.</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default SolutionSection;
