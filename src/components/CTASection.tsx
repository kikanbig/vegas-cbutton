import { Button } from "@/components/ui/button";

const CTASection = () => (
  <section className="py-28 px-4 bg-primary overflow-hidden">
    <div className="container mx-auto max-w-4xl text-center space-y-8">
      <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-primary-foreground leading-tight">
        Начните измерять то,<br />что действительно важно.
      </h2>
      <p className="text-lg md:text-2xl text-primary-foreground/70">
        Переходите от слепого трафика к управлению отношениями.
      </p>
      <Button
        size="lg"
        className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 md:px-12 py-6 md:py-8 text-lg md:text-2xl font-bold shadow-2xl shadow-accent/30 transition-all hover:shadow-accent/40 hover:scale-105 whitespace-normal"
      >
        Заказать Пилотный Комплект
      </Button>
      <p className="text-primary-foreground/50 text-lg pt-4">
        Vegas · Кнопка контакта
      </p>
    </div>
  </section>
);

export default CTASection;
