# app.py - Job Advisor Backend
from flask import Flask, request, jsonify
from flask_cors import CORS
from agent_client import JobAdvisorAgent
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize the agent client
agent = JobAdvisorAgent()

@app.route("/chat", methods=["POST"])
def chat():
    """Send a message to the Job Advisor agent"""
    try:
        data = request.get_json()
        message = data.get("message")
        thread_id = data.get("thread_id")  # For conversation continuity

        if not message:
            return jsonify({"error": "No message provided"}), 400

        print(f"/chat called - message length: {len(message)}")

        # Call the Azure AI Foundry agent
        response, new_thread_id = agent.chat(message, thread_id)

        return jsonify({
            "response": response,
            "thread_id": new_thread_id
        })
    except Exception as e:
        print(f"/chat error: {e}")
        return jsonify({"error": "Chat failed", "detail": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "agent": "Job Advisor"})

@app.route("/reset", methods=["POST"])
def reset():
    """Reset conversation (create new thread)"""
    return jsonify({"message": "Conversation reset", "thread_id": None})

if __name__ == "__main__":
    print("Starting Job Advisor Backend...")
    app.run(debug=True, port=5002)
