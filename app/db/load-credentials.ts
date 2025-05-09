const loadCredentials = () => {
  if (process.env.TURSO_URL === undefined || process.env.TURSO_URL === "") {
    throw new Error("TURSO_URL not set");
  }
  if (process.env.TURSO_KEY === undefined || process.env.TURSO_KEY === "") {
    throw new Error("TURSO_KEY not set");
  }
  return {
    url: process.env.TURSO_URL,
    token: process.env.TURSO_KEY,
  };
};

export const dbCredentials = loadCredentials();
