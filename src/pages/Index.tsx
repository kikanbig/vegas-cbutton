import Header from "@/components/Header";
import MetricsSection from "@/components/MetricsSection";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import stepEntrance from "@/assets/step-entrance.png";
import stepContact from "@/assets/step-contact.png";
import handPressing from "@/assets/hand-pressing-button.png";
import stepResult from "@/assets/step-result.png";
import buttonImage from "@/assets/button-quadrant.png";

const steps = [
  {
    image: stepEntrance,
    title: "Гость заходит в салон",
    text: "Счётчик на входе считает весь трафик. Это ещё не продажи — только люди в зале.",
  },
  {
    image: stepContact,
    title: "Вы начинаете диалог",
    text: "Если гость целевой — вы вступаете в контакт. Не каждый посетитель становится клиентом.",
  },
  {
    image: handPressing,
    title: "Нажимаете кнопку",
    text: "Четыре сектора — сколько человек в группе: 1, 2, 3 или 4+. Одно нажатие = один контакт.",
  },
  {
    image: stepResult,
    title: "Фиксируете консультацию",
    text: "Сразу после нажатия отмечаете, чем закончился разговор: КП, проект или отказ.",
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <section className="section-padding">
          <div className="container mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center md:text-left">
              <p className="text-primary font-extrabold tracking-wide">Vegas · Кнопка контакта</p>
              <h1 className="text-4xl md:text-6xl font-black leading-tight">
                Как мы считаем настоящие контакты в салоне
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Счётчик на входе видит всех. Касса видит только покупку.
                Кнопка закрывает разрыв: сколько целевых гостей вы встретили
                и чем закончилась консультация.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8"
                  onClick={() => navigate("/auth?mode=register")}
                >
                  Регистрация
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8"
                  onClick={() => navigate("/auth")}
                >
                  Войти
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <img src={buttonImage} alt="Кнопка контакта" className="w-72 md:w-96 drop-shadow-2xl" />
            </div>
          </div>
        </section>

        <section className="section-padding pt-0">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl md:text-5xl font-black text-center mb-12">Как это работает</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <div key={step.title} className="card-glass overflow-hidden">
                  <div className="aspect-square overflow-hidden">
                    <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 space-y-2">
                    <p className="text-primary font-extrabold">{i + 1}</p>
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MetricsSection />

        <section className="section-padding bg-card/40">
          <div className="container mx-auto max-w-4xl space-y-8">
            <h2 className="text-3xl md:text-5xl font-black text-center">Что делать продавцу</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Откройте смену",
                  text: "В приложении включите смену в начале рабочего дня. Если нужен перерыв — поставьте паузу, не закрывая смену.",
                },
                {
                  title: "Нажмите сектор",
                  text: "Когда начинаете работу с целевым гостем, нажмите сектор по числу людей в группе. Не нажимайте «на всякий случай».",
                },
                {
                  title: "Закройте консультацию",
                  text: "Сразу отметьте результат: отправили КП, предложили проект или гость отказался. Так воронка становится честной.",
                },
              ].map((item) => (
                <div key={item.title} className="card-glass p-6 space-y-3">
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button className="rounded-full px-8" variant="outline" onClick={() => navigate("/install")}>
                Как установить на телефон
              </Button>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="container mx-auto max-w-3xl space-y-6">
            <h2 className="text-3xl md:text-5xl font-black text-center">Зачем это нужно</h2>
            <div className="card-glass p-8 space-y-4 text-lg text-muted-foreground leading-relaxed">
              <p>
                Без кнопки мы видим только вход и кассу. Между ними — «чёрный ящик»:
                сколько людей вы реально встретили, сколько консультаций довели до КП,
                где теряются гости.
              </p>
              <p>
                Это не контроль ради контроля. Это общая картина салона:
                нагрузка на смену, качество контакта и узкие места воронки.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Index;
