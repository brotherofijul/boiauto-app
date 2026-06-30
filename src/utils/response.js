// /src/utils/response.js
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}
