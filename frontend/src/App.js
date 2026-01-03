import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import WorkIcon from '@mui/icons-material/Work';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ReactMarkdown from 'react-markdown';

// Use Netlify function in production, localhost in development
const API_URL = process.env.NODE_ENV === 'production'
  ? '/.netlify/functions'
  : 'http://localhost:5002';

function App() {
  const [conversationHistory, setConversationHistory] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `**Welcome to Job Advisor!**

I'll help you pick the right resume for each job application.

**How to use:**
1. Paste a job description below
2. I'll recommend which of your 4 resumes to use
3. I'll track patterns across jobs to suggest improvements

**Your Resumes:**
- DotNet_FS_Engineer
- FullStack_CloudArch
- Intel_Automation
- LLM_MLOPS_Engineer

Paste a job description to get started!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [threadId, setThreadId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**Error:** ${data.detail || data.error}`
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response
        }]);
        if (data.conversationHistory) {
          setConversationHistory(data.conversationHistory);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Connection Error:** Could not reach the backend.`
      }]);
    }

    setLoading(false);
  };

  const handleReset = () => {
    setConversationHistory([]);
    setMessages([{
      role: 'assistant',
      content: `**Conversation Reset!**

Ready to analyze more job postings. Paste a job description below.`
    }]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={1}>
            <WorkIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold">
              Job Advisor
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Powered by Azure AI Foundry
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
            <Chip label="DotNet_FS" size="small" color="primary" variant="outlined" />
            <Chip label="FullStack_Cloud" size="small" color="secondary" variant="outlined" />
            <Chip label="Intel_Automation" size="small" color="success" variant="outlined" />
            <Chip label="LLM_MLOPS" size="small" color="warning" variant="outlined" />
          </Stack>
        </Box>

        {/* Chat Container */}
        <Paper
          elevation={3}
          sx={{
            height: '60vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 3,
          }}
        >
          {/* Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2,
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '80%',
                    backgroundColor: msg.role === 'user' ? 'primary.dark' : 'background.default',
                    borderRadius: 2,
                  }}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {children}
                        </Typography>
                      ),
                      strong: ({ children }) => (
                        <Typography component="span" fontWeight="bold" color="primary.light">
                          {children}
                        </Typography>
                      ),
                      li: ({ children }) => (
                        <Typography component="li" variant="body2" sx={{ ml: 2 }}>
                          {children}
                        </Typography>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                <Paper sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={20} />
                    <Typography variant="body2">Analyzing job posting...</Typography>
                  </Stack>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1}>
              <IconButton onClick={handleReset} color="secondary" title="Reset conversation">
                <RestartAltIcon />
              </IconButton>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Paste a job description here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={!input.trim() || loading}
                color="primary"
                sx={{
                  backgroundColor: 'primary.main',
                  '&:hover': { backgroundColor: 'primary.dark' },
                  '&:disabled': { backgroundColor: 'action.disabledBackground' },
                }}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Box>
        </Paper>

        {/* Footer */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Using SuperAgent with Memory | Tracks patterns across job applications
        </Typography>
      </Container>
    </Box>
  );
}

export default App;
