# agent_client.py - Azure OpenAI Client (API Key auth)
import os
import requests
from dotenv import load_dotenv

load_dotenv()

class JobAdvisorAgent:
    def __init__(self):
        # Azure OpenAI endpoint (not the agent endpoint)
        self.endpoint = os.getenv("AZURE_ENDPOINT", "https://troy-mj186sow-swedencentral.services.ai.azure.com")
        self.api_key = os.getenv("AZURE_API_KEY")
        self.deployment = os.getenv("AZURE_DEPLOYMENT", "gpt-4o")

        if not self.api_key:
            raise ValueError("Missing AZURE_API_KEY in .env")

        # Build the chat completions URL
        self.chat_url = f"{self.endpoint}/openai/deployments/{self.deployment}/chat/completions?api-version=2024-10-21"

        print(f"Connected to Azure OpenAI: {self.deployment}")

        self.conversation_history = []

        # System prompt for the Resume Advisor
        self.system_prompt = """## Role
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
**Notes:** [only if needed]"""

    def chat(self, message: str, thread_id: str = None) -> tuple[str, str]:
        """
        Send a message to the Resume Advisor.
        """
        try:
            # Add user message to history
            self.conversation_history.append({"role": "user", "content": message})

            # Build messages with system prompt
            messages = [
                {"role": "system", "content": self.system_prompt},
                *self.conversation_history
            ]

            payload = {
                "messages": messages,
                "max_tokens": 1000,
                "temperature": 0.3
            }

            headers = {
                "Content-Type": "application/json",
                "api-key": self.api_key
            }

            response = requests.post(
                self.chat_url,
                json=payload,
                headers=headers
            )

            print(f"Response status: {response.status_code}")

            if response.status_code != 200:
                print(f"Error: {response.status_code} - {response.text}")
                raise Exception(f"API error: {response.status_code} - {response.text}")

            data = response.json()
            assistant_message = data["choices"][0]["message"]["content"]

            # Add to history
            self.conversation_history.append({"role": "assistant", "content": assistant_message})

            return assistant_message, thread_id

        except Exception as e:
            print(f"Agent error: {e}")
            raise e

    def reset(self):
        """Reset conversation history"""
        self.conversation_history = []
