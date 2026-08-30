import pinkButton from "@/assets/pink-button-hero.png";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

const HeroSection = () => (
  <section className="min-h-[90vh] flex items-center section-padding relative overflow-hidden">
    <div className="container mx-auto max-w-6xl">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8 text-center md:text-left">
          <p className="text-primary font-extrabold text-lg tracking-wide">{BRAND_NAME}</p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight">
            Верните продажи<br />человеку.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-lg leading-relaxed mx-auto md:mx-0">
            «Кнопка контакта» — недостающее звено между счётчиком на входе и кассовым аппаратом.
          </p>
          <div className="flex justify-center md:justify-start">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 md:px-10 py-6 md:py-7 text-lg md:text-xl font-semibold shadow-xl shadow-accent/25 transition-all hover:shadow-2xl hover:shadow-accent/30 hover:scale-105 w-full sm:w-auto"
            >
              Заказать пилотный комплект
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <img
            src={pinkButton}
            alt="Кнопка контакта Vegas"
            className="w-80 md:w-[28rem] animate-fade-in-up drop-shadow-2xl"
          />
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
