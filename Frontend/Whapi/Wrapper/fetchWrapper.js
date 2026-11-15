import { reconnectSocket } from "../src/Socket/socket";

let refreshPromise = null;
let currentToken = null;

async function refreshSession({ onSessionExpired }) {
  // If another refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshRes = await fetch(
        "http://localhost:3000/whapi/v1/auth/refresh",
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!refreshRes.ok) {
        const error = new Error("SESSION_EXPIRED");
        error.status = 401;
        throw error;
      }

      const refreshData = await refreshRes.json();

      const newToken = refreshData.payload.data.token;
      const user = refreshData.payload.data.user;

      currentToken = newToken;

      return { token: newToken, user };
    } catch (error) {
      onSessionExpired?.();
      throw error;
    } finally {
      // Reset the refresh promise
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function setCurrentToken(token) {
  currentToken = token;
}

export default async function fetchWrapper({
  updateSession,
  token,
  url,
  options = {},
  onSessionExpired,
}) {
  const tokenToUse = currentToken ?? token;

  // Try the request with the current token
  let res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${tokenToUse}`,
    },
  });

  // If the request was successful, return the response
  if (res.status !== 401) {
    return res;
  }

  try {
    // If the token is expired, refresh it
    const { token: newToken, user } = await refreshSession({
      onSessionExpired,
    });

    updateSession?.({
      user,
      token: newToken,
    });

    if (currentToken !== newToken) {
      currentToken = newToken;
      reconnectSocket(newToken);
    }

    // Retry the original request with the new token
    res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });

    return res;
  } catch (error) {
    if (error.message === "SESSION_EXPIRED") {
      onSessionExpired?.();
    }

    throw error;
  }
}
