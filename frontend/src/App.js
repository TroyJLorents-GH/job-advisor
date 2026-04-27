import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Tab,
  Tabs,
  Button,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import WorkIcon from '@mui/icons-material/Work';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ReactMarkdown from 'react-markdown';

// Chat API (Foundry Agent)
const CHAT_API = process.env.NODE_ENV === 'production'
  ? '/.netlify/functions'
  : 'http://localhost:5002';

// Document Intelligence API (Azure VM)
const DOC_API = process.env.NODE_ENV === 'production'
  ? '/.netlify/functions/doc-api'
  : 'http://52.233.82.247:5000';

function App() {
  const [tab, setTab] = useState(0);

  // === MATCH STATE ===
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [matching, setMatching] = useState(false);
  const [matchResults, setMatchResults] = useState(null);
  const [matchError, setMatchError] = useState('');
  const [loadingResumes, setLoadingResumes] = useState(false);
  const fileInputRef = useRef(null);

  // === CHAT STATE ===
  const [conversationHistory, setConversationHistory] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `**Welcome to Resume Match AI!**

I'm your AI-powered resume advisor. I can help you:

1. **Match Tab** - Upload resumes & match them against job descriptions
2. **Chat Tab** - Ask me questions about your resumes and job strategy

Switch to the **Match** tab to upload resumes and start matching!`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch resumes from API on mount
  const fetchResumes = useCallback(async () => {
    setLoadingResumes(true);
    try {
      const res = await fetch(`${DOC_API}/documents`);
      if (res.ok) {
        const data = await res.json();
        setResumes(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    }
    setLoadingResumes(false);
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // === MATCH HANDLERS ===
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);
    setMatchError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${DOC_API}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setUploadProgress(`${file.name} analyzed successfully!`);
        fetchResumes();
      } else {
        setMatchError(data.error || 'Upload failed');
        setUploadProgress('');
      }
    } catch (err) {
      setMatchError('Could not connect to API. Is the VM running?');
      setUploadProgress('');
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (docId) => {
    try {
      const res = await fetch(`${DOC_API}/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        setResumes(prev => prev.filter(r => r.id !== docId));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleMatch = async () => {
    if (!jobDescription.trim() || resumes.length === 0) return;

    setMatching(true);
    setMatchResults(null);
    setMatchError('');

    try {
      const res = await fetch(`${DOC_API}/match-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jobDescription.trim() }),
      });

      const data = await res.json();

      if (data.error && !data.matches) {
        setMatchError(data.error);
      } else {
        setMatchResults(data);
      }
    } catch (err) {
      setMatchError('Could not connect to API. Is the VM running?');
    }

    setMatching(false);
  };

  // === CHAT HANDLERS ===
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${CHAT_API}/chat`, {
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

  const getConfidenceColor = (confidence) => {
    if (confidence >= 75) return 'success';
    if (confidence >= 50) return 'warning';
    return 'error';
  };

  // === RENDER ===
  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={0.5}>
            <WorkIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight="bold">
              Resume Match AI
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            AI-Powered Resume Matching | Azure Document Intelligence + Embeddings + Cosmos DB
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          centered
          sx={{ mb: 2 }}
        >
          <Tab icon={<CompareArrowsIcon />} label="Match" />
          <Tab icon={<SendIcon />} label="Chat" />
        </Tabs>

        {/* === MATCH TAB === */}
        {tab === 0 && (
          <Box>
            {/* Upload Section */}
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">
                  Your Resumes ({resumes.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="small"
                >
                  Upload Resume
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUpload}
                  accept=".pdf,.docx,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                />
              </Stack>

              {uploading && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary">{uploadProgress}</Typography>
                </Box>
              )}
              {uploadProgress && !uploading && (
                <Alert severity="success" sx={{ mt: 1 }} onClose={() => setUploadProgress('')}>
                  {uploadProgress}
                </Alert>
              )}

              {loadingResumes ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : resumes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  No resumes uploaded yet. Upload PDF resumes to get started.
                </Typography>
              ) : (
                <List dense sx={{ mt: 1 }}>
                  {resumes.map((resume) => (
                    <ListItem key={resume.id} sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                      <DescriptionIcon sx={{ mr: 1, color: 'primary.light' }} />
                      <ListItemText
                        primary={resume.filename}
                        secondary={`${resume.contentLength || 0} chars | ${(resume.keyPhrases || []).length} key phrases | ${resume.uploadedAt?.split('T')[0] || ''}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" size="small" onClick={() => handleDelete(resume.id)} title="Delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            {/* Job Description Input */}
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Typography variant="h6" mb={1}>
                Job Description
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Paste the full job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={matching}
                sx={{ mb: 1 }}
              />
              <Button
                variant="contained"
                color="secondary"
                startIcon={matching ? <CircularProgress size={18} /> : <CompareArrowsIcon />}
                onClick={handleMatch}
                disabled={matching || !jobDescription.trim() || resumes.length === 0}
                fullWidth
                size="large"
              >
                {matching ? 'Matching...' : 'Match Resumes'}
              </Button>
            </Paper>

            {/* Error */}
            {matchError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMatchError('')}>
                {matchError}
              </Alert>
            )}

            {/* Results */}
            {matchResults && (
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" mb={1}>
                  Match Results
                </Typography>

                {matchResults.recommendation && (
                  <Alert
                    severity={matchResults.matches?.[0]?.confidence >= 75 ? 'success' : matchResults.matches?.[0]?.confidence >= 50 ? 'warning' : 'error'}
                    sx={{ mb: 2 }}
                  >
                    {matchResults.recommendation}
                  </Alert>
                )}

                <Typography variant="body2" color="text.secondary" mb={1}>
                  Scanned {matchResults.totalResumesScanned} resume(s) | Found {matchResults.jobRequirements?.length || 0} job requirements
                </Typography>

                {matchResults.jobRequirements?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" mb={0.5}>Extracted Requirements:</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {matchResults.jobRequirements.map((req, i) => (
                        <Chip key={i} label={req} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Divider sx={{ my: 1 }} />

                {matchResults.matches?.map((match, i) => (
                  <Card key={i} sx={{ mb: 1.5, bgcolor: 'background.default' }}>
                    <CardContent sx={{ pb: '12px !important' }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            #{i + 1} {match.filename}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={`${match.confidence}% Match`}
                            color={getConfidenceColor(match.confidence)}
                            size="small"
                          />
                          <Chip
                            label={`${match.skillMatchPercent}% Skills`}
                            color={getConfidenceColor(match.skillMatchPercent)}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>

                      {/* Matched Skills */}
                      {match.matchedSkills?.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
                            <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="caption" fontWeight="bold" color="success.main">
                              Matched ({match.matchedSkills.length})
                            </Typography>
                          </Stack>
                          <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {match.matchedSkills.map((skill, j) => (
                              <Chip key={j} label={skill} size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Missing Skills */}
                      {match.missingSkills?.length > 0 && (
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
                            <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Typography variant="caption" fontWeight="bold" color="warning.main">
                              Gaps ({match.missingSkills.length})
                            </Typography>
                          </Stack>
                          <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {match.missingSkills.map((skill, j) => (
                              <Chip key={j} label={skill} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Paper>
            )}
          </Box>
        )}

        {/* === CHAT TAB === */}
        {tab === 1 && (
          <Box>
            {/* Resume chips */}
            <Stack direction="row" spacing={1} justifyContent="center" mb={2}>
              {resumes.length > 0 ? (
                resumes.map((r, i) => (
                  <Chip
                    key={r.id}
                    label={r.filename?.replace(/\.[^.]+$/, '').substring(0, 20)}
                    size="small"
                    color={['primary', 'secondary', 'success', 'warning'][i % 4]}
                    variant="outlined"
                  />
                ))
              ) : (
                <>
                  <Chip label="No resumes" size="small" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    Upload resumes in the Match tab first
                  </Typography>
                </>
              )}
            </Stack>

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
                        <Typography variant="body2">Analyzing...</Typography>
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
                    placeholder="Ask about your resumes or paste a job description..."
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
          </Box>
        )}

        {/* Footer */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Resume Match AI | Azure Document Intelligence + Cosmos DB + AI Embeddings + Foundry Agent
        </Typography>
      </Container>
    </Box>
  );
}

export default App;
