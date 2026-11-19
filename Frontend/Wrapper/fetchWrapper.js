import { reconnectSocket } from "../src/Socket/socket.js";

let refreshPromise = null;
let currentToken = null;
let sessionExpiredHandled = false;

async function refreshSession() {
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
      if (error.message === "SESSION_EXPIRED") {
        handleSessionExpired();
      }
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
  if (token) {
    sessionExpiredHandled = false;
  }
}

function handleSessionExpired() {
  if (sessionExpiredHandled) return;

  sessionExpiredHandled = true;

  localStorage.removeItem("user");
  localStorage.removeItem("token");
  currentToken = null;

  try {
    socket.disconnect();
  } catch (_) {}

  throw new Error("SESSION_EXPIRED");
}

export default async function fetchWrapper({
  updateSession,
  token,
  url,
  options = {},
  retry = true,
}) {
  const tokenToUse = currentToken ?? token;

  const headers = {
    ...options.headers,
  };

  if (tokenToUse) {
    headers.Authorization = `Bearer ${tokenToUse}`;
  }

  // Try the request with the current token
  let res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // If the request was successful, return the response
  if (res.status !== 401 || !retry) {
    return res;
  }

  try {
    // If the token is expired, refresh it
    const { token: newToken, user } = await refreshSession();

    updateSession?.({
      user,
      token: newToken,
    });

    if (currentToken !== newToken) {
      currentToken = newToken;
      reconnectSocket(newToken);
    }

    // Retry the original request with the new token
    return await fetchWrapper({
      updateSession,
      token: newToken,
      url,
      options,
      retry: false,
    });
  } catch (error) {
    // refreshSession ya maneja onSessionExpired internamente
    throw error;
  }
}
