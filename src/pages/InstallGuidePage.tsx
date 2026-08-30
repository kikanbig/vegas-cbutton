import { ArrowLeft, Download, Share, MoreVertical, Plus, Smartphone, UserPlus, LogIn, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

const InstallGuidePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад
        </button>

        <div className="space-y-2 mb-10">
          <h1 className="text-3xl md:text-4xl font-black">Установка {BRAND_NAME}</h1>
          <p className="text-muted-foreground text-lg">
            Пошаговая инструкция для продавцов
          </p>
        </div>

        {/* Important note */}
        <div className="mb-10 p-4 rounded-xl border border-accent/30 bg-accent/5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Важно:</strong> сначала зарегистрируйтесь в браузере, затем установите приложение и <strong className="text-foreground">входите уже из приложения</strong>. Так сессия сохранится на месяц и не потребуется повторный вход.
          </p>
        </div>

        {/* Step 1 — Registration in browser */}
        <section className="mb-10">
          <StepHeader number={1} title="Зарегистрируйтесь в браузере" icon={<UserPlus className="w-5 h-5" />} />
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              Откройте в браузере телефона этот сайт.
            </p>
            <p>
              В правом верхнем углу нажмите <strong className="text-foreground">«Регистрация»</strong>, введите свой рабочий email и имя.
            </p>
            <p>
              На почту придёт <strong className="text-foreground">8-значный код</strong> — введите его. Вы попадёте в приложение. Убедитесь, что регистрация прошла успешно.
            </p>
            <p className="text-sm text-accent">
              ⚠️ Не закрывайте браузер — сейчас нужно установить приложение.
            </p>
          </div>
        </section>

        {/* Step 2 - iOS */}
        <section className="mb-10">
          <StepHeader number={2} title="Установите на iPhone (Safari)" icon={<Smartphone className="w-5 h-5" />} />
          <ol className="space-y-4 text-muted-foreground leading-relaxed list-none">
            <li className="flex gap-3">
              <StepBullet n={1} />
              <span>Убедитесь, что сайт открыт в <strong className="text-foreground">Chrome</strong> (если будут проблемы — используйте <strong className="text-foreground">Safari</strong>).</span>
            </li>
            <li className="flex gap-3">
              <StepBullet n={2} />
              <span>
                Нажмите кнопку <strong className="text-foreground">«Поделиться»</strong>{" "}
                <Share className="inline w-4 h-4 text-foreground" /> вверху экрана.
              </span>
            </li>
            <li className="flex gap-3">
              <StepBullet n={3} />
              <span>
                Прокрутите вниз и выберите <strong className="text-foreground">«На экран „Домой"»</strong>{" "}
                <Plus className="inline w-4 h-4 text-foreground" />.
              </span>
            </li>
            <li className="flex gap-3">
              <StepBullet n={4} />
              <span>Нажмите <strong className="text-foreground">«Добавить»</strong> в правом верхнем углу.</span>
            </li>
          </ol>
        </section>

        {/* Step 2 alt - Android */}
        <section className="mb-10">
          <StepHeader number={2} title="Установите на Android (Chrome)" icon={<Smartphone className="w-5 h-5" />} subtitle="альтернатива" />
          <ol className="space-y-4 text-muted-foreground leading-relaxed list-none">
            <li className="flex gap-3">
              <StepBullet n={1} />
              <span>Убедитесь, что сайт открыт в <strong className="text-foreground">Chrome</strong>.</span>
            </li>
            <li className="flex gap-3">
              <StepBullet n={2} />
              <span>
                Нажмите <strong className="text-foreground">три точки</strong>{" "}
                <MoreVertical className="inline w-4 h-4 text-foreground" /> в правом верхнем углу.
              </span>
            </li>
            <li className="flex gap-3">
              <StepBullet n={3} />
              <span>
                Выберите <strong className="text-foreground">«Установить приложение»</strong> или <strong className="text-foreground">«Добавить на главный экран»</strong>{" "}
                <Download className="inline w-4 h-4 text-foreground" />.
              </span>
            </li>
            <li className="flex gap-3">
              <StepBullet n={4} />
              <span>Подтвердите — нажмите <strong className="text-foreground">«Установить»</strong>.</span>
            </li>
          </ol>
        </section>

        {/* Step 3 — Login from PWA */}
        <section className="mb-10">
          <StepHeader number={3} title="Войдите из приложения" icon={<LogIn className="w-5 h-5" />} />
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              Откройте <strong className="text-foreground">{BRAND_NAME}</strong> с рабочего стола — оно запустится в полноэкранном режиме.
            </p>
            <p>
              Нажмите <strong className="text-foreground">«Войти»</strong>, введите свой email. На почту придёт <strong className="text-foreground">8-значный код</strong> — введите его.
            </p>
            <p className="text-sm text-accent font-medium">
              ✅ Сессия сохранится на месяц — повторный вход не потребуется.
            </p>
          </div>
        </section>

        {/* Step 4 */}
        <section className="mb-10">
          <StepHeader number={4} title="Готово! Начните работу" />
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              Когда клиент подходит — нажмите кнопку. Это всё, что нужно делать.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10 p-6 rounded-2xl border border-border bg-card">
          <h2 className="text-xl font-bold mb-4">Частые вопросы</h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Почему нельзя войти в браузере и сразу использовать?</p>
              <p>Браузер и установленное приложение хранят данные отдельно. Чтобы сессия сохранялась надолго, входите именно из приложения.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Приложение не появляется на экране?</p>
              <p>Убедитесь, что используете Safari на iPhone или Chrome на Android. Другие браузеры могут не поддерживать установку.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Код не приходит на почту?</p>
              <p>Проверьте папку «Спам». Если кода нет — попросите руководителя проверить правильность email.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Можно ли использовать на нескольких устройствах?</p>
              <p>Да, войдите с тем же email на другом устройстве и установите приложение.</p>
            </div>
          </div>
        </section>

        <div className="text-center pb-8">
          <Button onClick={() => navigate("/auth?mode=register")} size="lg" className="rounded-full px-8">
            Перейти к регистрации
          </Button>
        </div>
      </div>
    </div>
  );
};

const StepBullet = ({ n }: { n: number }) => (
  <span className="shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold">
    {n}
  </span>
);

const StepHeader = ({ number, title, icon, subtitle }: { number: number; title: string; icon?: React.ReactNode; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
      {number}
    </span>
    {icon}
    <div>
      <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  </div>
);

export default InstallGuidePage;
