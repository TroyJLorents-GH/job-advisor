// Netlify Function - Job Advisor Chat
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

  const apiKey = process.env.AZURE_API_KEY;
  const endpoint = process.env.AZURE_ENDPOINT || "https://troy-mj186sow-swedencentral.services.ai.azure.com";
  const deployment = process.env.AZURE_DEPLOYMENT || "gpt-4o";

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Azure API key not configured" }),
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

    const SYSTEM_PROMPT = `## Role
You are my job application advisor. Your job is to quickly recommend which of my 4 resumes best matches a job posting and flag any patterns that suggest resume refinements.

## My Resumes

1. **DotNet_FS_Engineer** — Backend-heavy .NET focus: ASP.NET Core Web APIs, Entity Framework/Dapper, SQL Server optimization, C#, legacy .NET Framework migrations, API performance tuning, Azure DevOps CI/CD. React as supporting frontend skill.

2. **FullStack_CloudArch** — Cloud architecture & DevOps focus: Multi-cloud (Azure/AWS/GCP), infrastructure design, CI/CD pipelines, system modernization, Docker, technical leadership. Full-stack with Python (FastAPI/Flask) + .NET + React.

3. **Intel_Automation** — Intelligent automation & RPA focus: Power Automate, Power Apps, n8n, UiPath, Blue Prism, Azure Logic Apps, workflow orchestration, low-code + pro-code integration. Includes AI-enabled automation with Azure AI Foundry.

4. **LLM_MLOPS_Engineer** — AI/ML systems focus: LLMs (GPT-4, Claude), RAG pipelines, vector databases, Azure AI Foundry, LangChain, agentic AI (ReAct pattern), multimodal processing (vision/OCR), prompt engineering, model deployment.

## Workflow
When I paste a job description:
1. **Recommend** — Tell me which resume to use (just the name, no explanation needed unless it's a close call)
2. **Match confidence** — High / Medium / Low
3. **Gaps** (optional) — Only mention if a critical skill is missing that I might actually have

## Decision Logic
- Heavy .NET/C#/Entity Framework/SQL Server emphasis → **DotNet_FS_Engineer**
- Cloud infrastructure/DevOps/architecture/multi-cloud → **FullStack_CloudArch**
- RPA/Power Platform/workflow automation/low-code → **Intel_Automation**
- LLMs/RAG/AI agents/ML pipelines/prompt engineering → **LLM_MLOPS_Engineer**
- Generic "full stack" with no clear emphasis → Default to **FullStack_CloudArch** or **DotNet_FS_Engineer** based on tech stack mentioned

## Response Format
**Resume:** [name]
**Confidence:** [High/Medium/Low]
**Notes:** [only if needed]`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    const chatUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-10-21`;

    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        messages: messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure API error:", response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: "Failed to get response from Azure" }),
      };
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "";

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
