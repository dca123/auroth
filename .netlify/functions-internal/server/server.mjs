export { default } from "./main.mjs";
export const config = {
  name: "server handler",
  generator: "nitro@",
  path: "/*",
  nodeBundler: "none",
  includedFiles: ["**"],
  excludedPath: ["/.netlify/*"],
  preferStatic: true,
};