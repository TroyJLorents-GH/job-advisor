// Netlify Function - Job Advisor Chat using Azure AI Foundry Agent
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Service Principal credentials
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Azure credentials not configured" }),
    };
  }

  try {
    const { message, conversationHistory = [] } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Message is required" }),
      };
    }

    // Get Azure AD token using client credentials
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://ai.azure.com/.default",
      grant_type: "client_credentials",
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("Token error:", tokenError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to get Azure token" }),
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Build input messages for the agent
    const inputMessages = [
      ...conversationHistory,
      { role: "user", content: message }
    ];

    // Call the ResumeAgent via OpenAI Responses protocol
    const agentEndpoint = "https://troy-mj186sow-swedencentral.services.ai.azure.com/api/projects/troy-mj186sow-swedencentral_project/applications/ResumeAgent/protocols/openai/responses?api-version=2025-11-15-preview";

    const response = await fetch(agentEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        input: inputMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agent API error:", response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: "Failed to get response from Agent", detail: errorText }),
      };
    }

    const data = await response.json();

    // Extract assistant response
    let assistantMessage = "";

    if (data.output_text) {
      assistantMessage = data.output_text;
    } else if (data.output) {
      for (const item of data.output) {
        if (item.type === "message" && item.role === "assistant") {
          const content = item.content;
          if (Array.isArray(content)) {
            for (const c of content) {
              if (c.type === "output_text") {
                assistantMessage = c.text || "";
                break;
              }
            }
          } else {
            assistantMessage = String(content);
          }
          break;
        }
      }
    } else if (data.choices) {
      assistantMessage = data.choices[0]?.message?.content || "";
    }

    if (!assistantMessage) {
      assistantMessage = JSON.stringify(data);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: assistantMessage,
        conversationHistory: [
          ...conversationHistory,
          { role: "user", content: message },
          { role: "assistant", content: assistantMessage }
        ]
      }),
    };
  } catch (error) {
    console.error("Chat error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to process chat message" }),
    };
  }
};
