// src/FileUpload.tsx
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
import { useNavigate } from "react-router-dom";

export interface AnalysisResult {
  success: boolean;
  candidates: Candidate[];
  request_id: string;
  timestamp: string;
  processed_files: number;
  overall_summary?: string;
}

export interface Candidate {
  filename: string;
  ranking: number;
  suitability_score: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  recommendation: string;
  improvement_suggestions?: string[];
}

const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const invalid = files.filter(f => f.type !== "application/pdf");
      if (invalid.length > 0) {
        setError(`Invalid file(s): ${invalid.map(f => f.name).join(", ")}`);
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
      setError("Please select at least one resume.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setLoading(true);
    setError("");

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

      const result: AnalysisResult = await response.json();
      console.log("Backend response:", result);

      if (!result.success) {
        throw new Error("Analysis failed");
      }

      navigate("/results", { state: { analysisResult: result } });
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ height: "100vh", display: "flex", flexDirection: "column", py: 4 }}>
      <Paper sx={{ flex: 1, display: "flex", flexDirection: "column", p: 4 }}>
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
            <Button variant="contained" component="label" sx={{ mr: 2 }}>
              Add PDF Files
              <input type="file" hidden accept="application/pdf" multiple onChange={handleFileChange} />
            </Button>

            {selectedFiles.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  Selected Files ({selectedFiles.length}):
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: "auto", border: "1px solid #ddd", borderRadius: 1 }}>
                  {selectedFiles.map((file, i) => (
                    <ListItem
                      key={`${file.name}-${i}`}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => removeFile(i)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
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
        </Box>
      </Paper>
    </Container>
  );
};

export default FileUpload;
