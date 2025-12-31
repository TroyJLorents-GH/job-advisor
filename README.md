# Job Advisor - AI Resume Matcher

A personal chatbot that helps you pick the right resume for each job application using Azure AI Foundry.

## Features

- **Resume Matching** - Recommends which of your 4 resumes best matches a job posting
- **Pattern Tracking** - Uses memory to track patterns across multiple job applications
- **Resume Improvements** - Suggests edits after noticing patterns across 3+ jobs
- **Powered by Azure AI Foundry** - Uses GPT-4o with file search and web search

## Your Resumes

1. **DotNet_FS_Engineer** - Backend-heavy .NET focus
2. **FullStack_CloudArch** - Cloud architecture & DevOps focus
3. **Intel_Automation** - Intelligent automation & RPA focus
4. **LLM_MLOPS_Engineer** - AI/ML systems focus

## Setup

### 1. Get Agent ID from Azure AI Foundry

1. Go to https://ai.azure.com
2. Select your project (troy-mj186sow-swedencentral_project)
3. Go to **Build** > **Agents**
4. Click on your **SuperAgent**
5. Copy the **Agent ID** from the URL or settings

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Edit .env with your values:
# AZURE_PROJECT_ENDPOINT=https://troy-mj186sow-swedencentral.services.ai.azure.com/
# AZURE_AGENT_ID=your-agent-id

# Login to Azure (required for DefaultAzureCredential)
az login

# Run the server
python app.py
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the app
npm start
```

### 4. Use the App

1. Open http://localhost:3000
2. Paste a job description
3. Get your resume recommendation!

## Tech Stack

- **Frontend:** React + Material-UI
- **Backend:** Flask + Azure AI Projects SDK
- **AI:** Azure AI Foundry Agent (GPT-4o)
- **Auth:** Azure DefaultAzureCredential
