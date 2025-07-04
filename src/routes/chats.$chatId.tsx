import { Chat } from "@/components/Chat";
import { appDb } from "@/db";
import { chats } from "@/db/schema/chats";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

export const getChat = createServerFn()
  .validator((data: string) => data)
  .handler(async (ctx) => {
    const chat = await appDb.select().from(chats).where(eq(chats.id, ctx.data));
    return chat;
  });

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
