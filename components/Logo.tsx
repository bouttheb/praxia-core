import Image from "next/image";

const WORDMARK_SRC = "/branding/praxia-lockup-light.png";
const MARK_SRC = "/branding/praxia-mark-blue.png";

export function Logo({
  height = 32,
  alt = "Praxia Core",
  priority = true,
}: {
  height?: number;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={WORDMARK_SRC}
      alt={alt}
      width={1499}
      height={327}
      priority={priority}
      style={{ height, width: "auto" }}
    />
  );
}

export function PraxiaMark({
  size = 28,
  alt = "Praxia Core",
  priority = false,
}: {
  size?: number;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={MARK_SRC}
      alt={alt}
      width={512}
      height={512}
      priority={priority}
      style={{ width: size, height: size }}
    />
  );
}
