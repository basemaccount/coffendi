export async function submitRequest(endpoint, payload) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The request timed out. Please check your connection and try again.");
    throw new Error("The service could not be reached. Please check your connection and try again.");
  } finally {
    window.clearTimeout(timeout);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    result = { message: "The server returned an unexpected response." };
  }

  if (!response.ok) {
    const error = new Error(result.message || "Your request could not be submitted.");
    error.status = response.status;
    error.fields = result.errors || {};
    throw error;
  }

  return result;
}
