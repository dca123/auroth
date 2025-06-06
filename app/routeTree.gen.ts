/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as ChatsChatIdImport } from './routes/chats.$chatId'

// Create/Update Routes

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const ChatsChatIdRoute = ChatsChatIdImport.update({
  id: '/chats/$chatId',
  path: '/chats/$chatId',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/chats/$chatId': {
      id: '/chats/$chatId'
      path: '/chats/$chatId'
      fullPath: '/chats/$chatId'
      preLoaderRoute: typeof ChatsChatIdImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/chats/$chatId': typeof ChatsChatIdRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/chats/$chatId': typeof ChatsChatIdRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/chats/$chatId': typeof ChatsChatIdRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/chats/$chatId'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/chats/$chatId'
  id: '__root__' | '/' | '/chats/$chatId'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  ChatsChatIdRoute: typeof ChatsChatIdRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  ChatsChatIdRoute: ChatsChatIdRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/chats/$chatId"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/chats/$chatId": {
      "filePath": "chats.$chatId.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
