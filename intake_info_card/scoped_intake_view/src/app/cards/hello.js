// ES6 export for HubSpot App Card
export async function main(context = {}) {
  return { 
    statusCode: 200, 
    body: { 
      ok: true, 
      message: "Hello from serverless function!",
      echo: context.params || {} 
    } 
  };
}
