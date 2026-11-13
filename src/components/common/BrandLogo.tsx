import Image from "next/image";
import { cn } from "@/lib/utils";

/** The VAWE circle logo. The source image is 124px, so keep it at 64px or smaller to stay sharp. */
export function BrandLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/vawe-logo.png"
      alt="VAWE – Value Added Work in Empowerment"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
