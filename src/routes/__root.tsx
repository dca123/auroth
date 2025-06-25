/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "@/styles/globals.css?url";
import favicon from "@/static/favicon.ico?url";
import {
  Sidebar,
  SidebarContent,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getChatIds } from "@/server-functions/chats";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Auroth",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: favicon,
      },
    ],
  }),
  component: RootComponent,
  loader: async () => {
    return await getChatIds();
  },
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body className="bg-stone-50">
        <SidebarProvider>
          <AppSidebar />
          <main className="flex flex-col w-full p-2">
            <div className="flex flex-row space-x-1 items-center">
              <SidebarTrigger />
              <h1 className="font-semibold tracking-wide">Auroth</h1>
            </div>
            <Separator className="my-3" orientation="horizontal" />
            {children}
          </main>
        </SidebarProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AppSidebar() {
  const data = Route.useLoaderData();
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/">Chats</a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {data.map((c) => (
            <SidebarMenuItem key={c.id}>
              <SidebarMenuButton asChild>
                <a href={`/chats/${c.id}`}>
                  {truncateString(c.messages.at(0)?.content as string, 25)}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

function truncateString(str: string, targetLength: number) {
  const ellipsis = "...";
  if (str.length <= targetLength) {
    return str;
  }
  const truncated = str.slice(0, targetLength - ellipsis.length) + ellipsis;
  return truncated.length < str.length ? truncated : str;
}
