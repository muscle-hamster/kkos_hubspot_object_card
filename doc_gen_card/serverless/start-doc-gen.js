import crypto from "crypto";

const EXTERNAL_BASE_URL = process.env.EXTERNAL_BASE_URL; // e.g., https://mydomain.com
const SHARED_SECRET = process.env.APP_SHARED_SECRET;     // set via `hs secrets add`

export async function main(context, sendResponse) {
  try {
    const { intakeId, objectTypeId } = context.params.body || {};
    if (!intakeId) {
      return sendResponse({ statusCode: 400, body: { message: "Missing intakeId" } });
    }

    const payload = {
      intake_id: intakeId,
      object_type_id: objectTypeId || null,
      trigger: "ui-card-manual"
    };

    const body = JSON.stringify(payload);
    const signature = crypto.createHmac("sha256", SHARED_SECRET).update(body).digest("hex");

    const resp = await fetch(`${EXTERNAL_BASE_URL}/api/doc-generation/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-HubSpot-Extension-Signature": signature,
      },
      body,
    });

    if (!resp.ok) {
      const text = await resp.text();
      return sendResponse({ statusCode: 502, body: { message: "Upstream error", details: text } });
    }

    const data = await resp.json();
    return sendResponse({ statusCode: 200, body: data });
  } catch (err) {
    return sendResponse({ statusCode: 500, body: { message: "Serverless error", error: String(err) } });
  }
}
