import logo from "@/assets/logo.png";

export function KagomaLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Kagoma Protection Services"
      className={className}
      width={80}
      height={80}
    />
  );
}