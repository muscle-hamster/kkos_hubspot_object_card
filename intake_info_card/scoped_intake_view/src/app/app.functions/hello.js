// HubSpot App Function - hello.js
exports.main = async (context) => {
  try {
    return {
      statusCode: 200,
      body: {
        ok: true,
        message: "Hello from HubSpot App Function!",
        timestamp: new Date().toISOString(),
        context: context
      }
    };
  } catch (error) {
    console.error("Hello function error:", error);
    return {
      statusCode: 500,
      body: {
        error: "Internal server error",
        message: error.message
      }
    };
  }
};
