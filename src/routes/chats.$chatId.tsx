import { Chat } from "@/components/Chat";
import { getChat } from "@/lib/chat-store";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export const getChatServerFn = createServerFn()
  .validator((data: string) => data)
  .handler(async (ctx) => {
    const chat = await getChat(ctx.data);
    if (chat instanceof Error) {
      throw chat;
    }
    return chat;
  });

export const Route = createFileRoute("/chats/$chatId")({
  component: Home,
  loader: async ({ params }) =>
    getChatServerFn({
      data: params.chatId,
    }),
});

function Home() {
  const data = Route.useLoaderData();
  const { chatId } = Route.useParams();
  return <Chat chat={data} id={chatId} />;
}
