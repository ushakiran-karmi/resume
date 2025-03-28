import React, { useState } from "react";
import { 
  Button, 
  TextField, 
  Typography, 
  Box, 
  Paper, 
  CircularProgress, 
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Container
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";


const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (event.target.files) {
      const files = Array.from(event.target.files);
      
      // Validate PDF files
      const invalidFiles = files.filter(file => file.type !== "application/pdf");
      if (invalidFiles.length > 0) {
        setError(`Invalid file type: ${invalidFiles.map(f => f.name).join(", ")}. Only PDF files are allowed.`);
        return;
      }

      // Add new files to existing selection
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    // Validation
    if (selectedFiles.length === 0) {
      setError("Please select at least one resume");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a job description");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis("");

    try {
      const formData = new FormData();
      
      // Append each file with the correct field name
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      
      formData.append("description", description);

      const response = await fetch("http://127.0.0.1:8000/analyze-resumes", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Analysis failed");
      }
      
      setAnalysis(result.analysis);
    } catch (error) {
      console.error("Upload error:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ 
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      width: "500vh",
      ml: 10,
      py: 4
    }}>
      <Paper sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        p: 4,
        overflowY: "scroll"
      }}>
        <Typography variant="h4" gutterBottom>
          Multi-Resume Analysis
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Job Description"
            fullWidth
            multiline
            minRows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            required
          />

          <Box>
            <Button
              variant="contained"
              component="label"
              sx={{ mr: 2 }}
            >
              Add PDF Files
              <input
                type="file"
                hidden
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
              />
            </Button>
            
            {selectedFiles.length > 0 && (
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Selected Files ({selectedFiles.length}):
              </Typography>
            )}

            <List dense sx={{ 
              maxHeight: 200, 
              overflow: 'auto', 
              border: '1px solid #ddd', 
              borderRadius: 1 
            }}>
              {selectedFiles.map((file, index) => (
                <ListItem 
                  key={`${file.name}-${index}`}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => removeFile(index)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText 
                    primary={file.name} 
                    secondary={`${(file.size / 1024).toFixed(1)} KB`} 
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            fullWidth
            disabled={loading || selectedFiles.length === 0}
            size="large"
            sx={{ py: 1.5 }}
          >
            {loading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                Analyzing...
              </>
            ) : (
              "Analyze Resumes"
            )}
          </Button>

          {analysis && (
            <Box sx={{ 
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0  // Allows the content to scroll
            }}>
              <Typography variant="h6" gutterBottom>
                Analysis Results:
              </Typography>
              <Paper 
                elevation={2} 
                sx={{ 
                  flex: 1,
                  p: 3, 
                  whiteSpace: "pre-wrap", 
                  overflow: "auto",
                  bgcolor: 'background.paper'
                }}
              >
                {analysis}
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default FileUpload;