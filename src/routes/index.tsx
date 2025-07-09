// src/routes/index.tsx
import { Chat } from "@/components/Chat";
import { createFileRoute, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <Chat />;
}
