import logo from "@/assets/vegas-logo.png";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  imgClassName?: string;
  onClick?: () => void;
};

const BrandLogo = ({ className, imgClassName, onClick }: Props) => {
  const img = (
    <img
      src={logo}
      alt={BRAND_NAME}
      className={cn("h-9 w-auto select-none", imgClassName)}
      draggable={false}
    />
  );

  if (!onClick) {
    return <div className={className}>{img}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center", className)}>
      {img}
    </button>
  );
};

export default BrandLogo;
