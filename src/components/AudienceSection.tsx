import audienceFurniture from "@/assets/audience-furniture.png";
import audienceElectronics from "@/assets/audience-electronics.png";
import audienceLuxury from "@/assets/audience-luxury.png";

const audiences = [
  {
    image: audienceFurniture,
    title: "Салоны матрасов Vegas",
    desc: "Где консультация и подбор жёсткости решают сделку.",
  },
  {
    image: audienceLuxury,
    title: "Премиальные коллекции",
    desc: "Где экспертность продавца важнее витрины.",
  },
  {
    image: audienceElectronics,
    title: "Шоурумы и торговые центры",
    desc: "Где нужно отличать «туристов» от покупателей.",
  },
];

const AudienceSection = () => (
  <section className="section-padding">
    <div className="container mx-auto max-w-6xl">
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-center mb-16">
        Для кого это решение?
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {audiences.map((a) => (
          <div key={a.title} className="card-glass overflow-hidden hover:-translate-y-2 transition-transform">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={a.image} alt={a.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-xl font-bold text-foreground">{a.title}</h3>
              <p className="text-base text-muted-foreground">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xl text-muted-foreground mt-10 italic">
        Идеально для ситуаций, где важен контакт и экспертиза.
      </p>
    </div>
  </section>
);

export default AudienceSection;
