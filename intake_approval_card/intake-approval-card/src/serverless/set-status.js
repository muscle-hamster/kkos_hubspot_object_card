const API_BASE = "https://api.hubapi.com";
const TOKEN = process.env.HS_PRIVATE_APP_TOKEN; // set via `hs secrets add`

export async function main(context, sendResponse) {
  try {
    const { objectId, objectTypeId, approval_status } = context.params.body || {};
    if (!objectId || !objectTypeId || !approval_status) {
      return sendResponse({ statusCode: 400, body: { message: "Missing objectId/objectTypeId/approval_status" } });
    }

    const resp = await fetch(
      `${API_BASE}/crm/v3/objects/${encodeURIComponent(objectTypeId)}/${encodeURIComponent(objectId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties: { approval_status } }),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      return sendResponse({ statusCode: 502, body: { message: "HubSpot API error", details: text } });
    }

    return sendResponse({ statusCode: 200, body: { ok: true, status: approval_status } });
  } catch (e) {
    return sendResponse({ statusCode: 500, body: { message: "Serverless error", error: String(e) } });
  }
}

