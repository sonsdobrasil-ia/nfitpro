import { useEffect, useState } from "react";
import { resolveCoverUrl } from "@/lib/ebook-covers";

export function CoverImage({
  value,
  className,
  alt = "",
  fallback,
}: {
  value: string | null | undefined;
  className?: string;
  alt?: string;
  fallback?: React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    resolveCoverUrl(value).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [value]);
  if (!url) return <>{fallback ?? <div className={className} />}</>;
  return <img src={url} alt={alt} className={className} />;
}
