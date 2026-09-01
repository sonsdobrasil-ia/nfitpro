import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "nfitrun" },
      { name: "description", content: "nfitrun" },
      { property: "og:title", content: "nfitrun" },
      { property: "og:description", content: "nfitrun" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background" />
  );
}
