// functions/get-associations.js
//
// Purpose: return IDs of records associated to a given record.
// API:     GET /crm/v4/objects/{fromTypeId}/{fromObjectId}/associations/{toTypeId}?limit=100&after=...
//
// Required parameters (passed via runServerless parameters):
//   - fromTypeId:   e.g. "0-3" (deal), "0-1" (contact), "2-XXXX" (custom object)
//   - fromObjectId: e.g. 41361674390
//   - toTypeId:     the associated object type you want IDs for, e.g. "2-48847550"
//
// Optional:
//   - associationType: filter by specific association label/type (if you use labeled associations)
//   - limit:          page size (default 100; HubSpot max is typically 100)
//
// Auth:
//   - Provide a Private App token as a secret in your Developer Project, e.g. HUBSPOT_PRIVATE_APP_TOKEN.
//   - In HubSpot Dev Projects, secrets become process.env.VARIABLE_NAME at runtime.

const BASE = "https://api.hubapi.com"\;

export async function main(context) {
  try {
    const {
      fromTypeId,
      fromObjectId,
      toTypeId,
      associationType = null,
      limit = 100,
    } = context.parameters || {};

    // Validate inputs
    if (!fromTypeId || !fromObjectId || !toTypeId) {
      return {
        error: "Missing required parameter(s): fromTypeId, fromObjectId, toTypeId",
        statusCode: 400,
      };
    }

    // Auth
    const token =
      process.env.HUBSPOT_PRIVATE_APP_TOKEN ||
      process.env.HUBSPOT_ACCESS_TOKEN ||
      process.env.PRIVATE_APP_TOKEN; // use whichever name you stored
    if (!token) {
      return {
        error:
          "Missing auth token. Add a Private App token as a project secret (e.g., HUBSPOT_PRIVATE_APP_TOKEN).",
        statusCode: 500,
      };
    }

    // Build base URL
    const path = `/crm/v4/objects/${encodeURIComponent(
      fromTypeId
    )}/${encodeURIComponent(fromObjectId)}/associations/${encodeURIComponent(
      toTypeId
    )}`;

    let after = undefined;
    const ids = [];

    // Page through results
    do {
      const url = new URL(BASE + path);
      url.searchParams.set("limit", String(limit));
      if (associationType) url.searchParams.set("associationType", associationType);
      if (after) url.searchParams.set("after", after);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const bodyText = await res.text();
        return {
          error: `Association fetch failed: ${res.status} ${res.statusText} — ${bodyText}`,
          statusCode: res.status,
        };
      }

      const data = await res.json();

      // v4 returns an array of results; each has toObjectId or fromObjectId depending on direction.
      // For this endpoint (from → to), you should get `toObjectId`.
      for (const r of data.results || []) {
        const id = r.toObjectId ?? r.id ?? r.fromObjectId;
        if (id != null) ids.push(String(id));
      }

      after = data?.paging?.next?.after;
    } while (after);

    return { response: { ids } };
  } catch (err) {
    // Log for Application/Serverless logs in the Developer Project UI
    console.error("get-associations error:", err);
    return { error: "Unhandled error in get-associations.", statusCode: 500 };
  }
}
