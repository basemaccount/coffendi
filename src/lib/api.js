export async function submitRequest(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

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
