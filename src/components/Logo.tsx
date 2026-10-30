import logo from "@/assets/logo.png";

/** The church book club logo. `className` sets the corners and any white tile behind it. */
export function Logo({
  size = 36,
  className = "rounded-md",
  alt = "",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return <img src={logo} alt={alt} width={size} height={size} className={`shrink-0 ${className}`} />;
}
