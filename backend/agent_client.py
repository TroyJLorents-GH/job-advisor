# agent_client.py - Azure AI Foundry Agent Client
import os
import requests
import time
from dotenv import load_dotenv
from azure.identity import InteractiveBrowserCredential

load_dotenv()

# Global token cache
_cached_token = None
_token_expiry = None

def get_token(force_refresh=False):
    global _cached_token, _token_expiry

    # Check if token exists and is not expired (refresh 5 min before expiry)
    if not force_refresh and _cached_token is not None and _token_expiry is not None:
        if time.time() < _token_expiry - 300:  # 5 min buffer
            print(f"Using cached token (expires in {int((_token_expiry - time.time()) / 60)} min)")
            return _cached_token
        else:
            print("Token expired or expiring soon, refreshing...")

    # Use your Entra ID tenant
    tenant_id = "6da8a967-be75-4aa4-b913-1bc39a34b3be"
    credential = InteractiveBrowserCredential(
        tenant_id=tenant_id,
        additionally_allowed_tenants=['*']
    )

    # Try Azure AI Services scope (the actual resource)
    scope = "https://ai.azure.com/.default"
    print(f"Requesting token with scope: {scope} for tenant: {tenant_id}")

    token_response = credential.get_token(scope)
    _cached_token = token_response.token
    _token_expiry = token_response.expires_on
    print(f"Token acquired successfully")
    print(f"Token starts with: {_cached_token[:20]}...")
    print(f"Token expires at: {time.ctime(_token_expiry)}")
    return _cached_token

class JobAdvisorAgent:
    def __init__(self):
        # Azure AI Foundry Agent endpoint
        self.agent_endpoint = "https://troy-mj186sow-swedencentral.services.ai.azure.com/api/projects/troy-mj186sow-swedencentral_project/applications/ResumeAgent/protocols/openai/responses?api-version=2025-11-15-preview"

        # Get token
        self.token = get_token()
        print(f"Connected to ResumeAgent")

        self.conversation_history = []

    def chat(self, message: str, thread_id: str = None) -> tuple[str, str]:
        """
        Send a message to the ResumeAgent via OpenAI Responses protocol.
        """
        try:
            # Refresh token if needed
            self.token = get_token()

            # Build the input messages
            input_messages = self.conversation_history + [
                {"role": "user", "content": message}
            ]

            payload = {
                "input": input_messages
            }

            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }

            print(f"\n{'='*50}")
            print(f"Calling ResumeAgent...")
            print(f"Endpoint: {self.agent_endpoint}")
            print(f"Token (first 20 chars): {self.token[:20]}...")
            print(f"Payload: {payload}")
            print(f"{'='*50}\n")

            response = requests.post(
                self.agent_endpoint,
                json=payload,
                headers=headers,
                timeout=60
            )

            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")

            if response.status_code == 401:
                # Token expired, force refresh
                print("Token expired (401), forcing refresh...")
                self.token = get_token(force_refresh=True)
                headers["Authorization"] = f"Bearer {self.token}"
                response = requests.post(
                    self.agent_endpoint,
                    json=payload,
                    headers=headers,
                    timeout=60
                )
                print(f"Retry response status: {response.status_code}")

            if response.status_code != 200:
                print(f"Error: {response.status_code} - {response.text}")
                raise Exception(f"Agent API error: {response.status_code} - {response.text}")

            data = response.json()
            print(f"Response received")

            # Extract assistant response
            assistant_message = ""

            if "output_text" in data:
                assistant_message = data["output_text"]
            elif "output" in data:
                for item in data["output"]:
                    if item.get("type") == "message" and item.get("role") == "assistant":
                        content = item.get("content", [])
                        if isinstance(content, list):
                            for c in content:
                                if c.get("type") == "output_text":
                                    assistant_message = c.get("text", "")
                                    break
                        else:
                            assistant_message = str(content)
                        break
            elif "choices" in data:
                assistant_message = data["choices"][0]["message"]["content"]

            if not assistant_message:
                assistant_message = str(data)

            # Update conversation history
            self.conversation_history.append({"role": "user", "content": message})
            self.conversation_history.append({"role": "assistant", "content": assistant_message})

            return assistant_message, thread_id

        except Exception as e:
            print(f"Agent error: {e}")
            raise e

    def reset(self):
        """Reset conversation history"""
        self.conversation_history = []
