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
  Container,
  Divider,
  Card,
  CardContent
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
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
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
    <Container maxWidth={false} disableGutters sx={{ 
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "#f5f5f5",
      p: 3
    }}>
      <Card sx={{ width: "80vw", maxHeight: "90vh", overflowY: "auto", p: 4, borderRadius: 3, boxShadow: 3, bgcolor: "#ffffff" }}>
        <Typography variant="h4" gutterBottom textAlign="center" color="primary">
          Multi-Resume Analysis
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}> {error} </Alert>
        )}

        <CardContent>
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

          <Divider sx={{ my: 2 }} />

          <Button variant="contained" component="label" sx={{ mr: 2 }}>
            Add PDF Files
            <input type="file" hidden accept="application/pdf" multiple onChange={handleFileChange} />
          </Button>

          {selectedFiles.length > 0 && (
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
              Selected Files ({selectedFiles.length}):
            </Typography>
          )}

          <List dense sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1, bgcolor: "#fafafa", p: 1 }}>
            {selectedFiles.map((file, index) => (
              <ListItem key={`${file.name}-${index}`} secondaryAction={
                <IconButton edge="end" onClick={() => removeFile(index)}>
                  <DeleteIcon color="error" />
                </IconButton>
              }>
                <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} />
              </ListItem>
            ))}
          </List>

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            fullWidth
            disabled={loading || selectedFiles.length === 0}
            size="large"
            sx={{ py: 1.5, mt: 2 }}
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
            <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: "#e3f2fd" }}>
              <Typography variant="h6" gutterBottom>
                Analysis Results:
              </Typography>
              <Paper elevation={2} sx={{ p: 3, whiteSpace: "pre-wrap", overflow: "auto", bgcolor: 'background.paper' }}>
                {analysis}
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default FileUpload;
