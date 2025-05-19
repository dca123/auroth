import { Chat } from "@/components/chat";
import { getChat } from "@/server-functions/chats";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chats/$chatId")({
  component: Home,
  loader: async ({ params }) =>
    getChat({
      data: params.chatId,
    }),
});

function Home() {
  const data = Route.useLoaderData();
  const { chatId } = Route.useParams();
  return <Chat chat={data} id={chatId} />;
}
