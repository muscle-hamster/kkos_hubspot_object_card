// HubSpot App Function - get-associations.js
exports.main = async (context) => {
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
        statusCode: 400,
        body: {
          error: "Missing required parameter(s): fromTypeId, fromObjectId, toTypeId",
          received: { fromTypeId, fromObjectId, toTypeId }
        }
      };
    }

    // Auth - use HubSpot's built-in auth
    const token = context.secrets.PRIVATE_APP_ACCESS_TOKEN || 
                  context.secrets.HUBSPOT_PRIVATE_APP_TOKEN ||
                  process.env.PRIVATE_APP_ACCESS_TOKEN;

    if (!token) {
      return {
        statusCode: 500,
        body: {
          error: "Missing auth token. Add a Private App token as a project secret."
        }
      };
    }

    // Build API URL
    const baseUrl = "https://api.hubapi.com";
    const path = `/crm/v4/objects/${encodeURIComponent(fromTypeId)}/${encodeURIComponent(fromObjectId)}/associations/${encodeURIComponent(toTypeId)}`;
    
    let after = undefined;
    const ids = [];

    // Page through results
    do {
      const url = new URL(baseUrl + path);
      url.searchParams.set("limit", String(limit));
      if (associationType) url.searchParams.set("associationType", associationType);
      if (after) url.searchParams.set("after", after);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const bodyText = await response.text();
        return {
          statusCode: response.status,
          body: {
            error: `Association fetch failed: ${response.status} ${response.statusText}`,
            details: bodyText
          }
        };
      }

      const data = await response.json();

      // Extract IDs from results
      for (const result of data.results || []) {
        const id = result.toObjectId ?? result.id ?? result.fromObjectId;
        if (id != null) ids.push(String(id));
      }

      after = data?.paging?.next?.after;
    } while (after);

    return {
      statusCode: 200,
      body: {
        ids: ids,
        count: ids.length,
        fromTypeId,
        fromObjectId,
        toTypeId
      }
    };

  } catch (error) {
    console.error("Get-associations function error:", error);
    return {
      statusCode: 500,
      body: {
        error: "Internal server error",
        message: error.message
      }
    };
  }
};
