// src/Results.tsx
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Alert,
  AlertTitle,
  Button
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { Candidate, AnalysisResult } from "./FileUpload";
import DownloadIcon from "@mui/icons-material/Download";

const Results: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysisResult = location.state?.analysisResult as AnalysisResult | undefined;

  console.log("Received analysisResult in Results page:", analysisResult);

  if (!analysisResult) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>No Analysis Data Found</AlertTitle>
          Please upload resumes and analyze them first.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/")}>
          Go Back to Upload
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ mb: 4 }}>
        Analysis Results
      </Typography>

      {analysisResult.overall_summary && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Overall Summary
          </Typography>
          <Typography variant="body1" paragraph>
            {analysisResult.overall_summary}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Processed {analysisResult.processed_files} resumes on{" "}
            {new Date(analysisResult.timestamp).toLocaleString()}
          </Typography>
        </Paper>
      )}

      {analysisResult.candidates && analysisResult.candidates.length > 0 ? (
        <Grid container spacing={3}>
          {analysisResult.candidates.map((candidate) => (
            <Grid item xs={12} md={6} lg={4} key={candidate.filename}>
              <CandidateCard candidate={candidate} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mt: 3 }}>
          No candidates found in the analysis.
        </Alert>
      )}
    </Container>
  );
};

const CandidateCard = ({ candidate }: { candidate: Candidate }) => {
  const isTopThree = candidate.ranking <= 3;
  const borderColors = ["gold", "silver", "#cd7f32"]; // Top 3
  const borderColor = isTopThree ? borderColors[candidate.ranking - 1] : undefined;

  const downloadUrl = `/api/download/${candidate.filename}`; // Adjust if needed

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: isTopThree ? `2px solid ${borderColor}` : undefined,
        boxShadow: isTopThree ? `0 0 10px ${borderColor}` : undefined,
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" component="div">
            #{candidate.ranking} - {candidate.filename}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {isTopThree && (
              <Chip
                label={
                  candidate.ranking === 1
                    ? "Top Resume"
                    : candidate.ranking === 2
                    ? "2nd Best"
                    : "3rd Best"
                }
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={`Score: ${candidate.suitability_score}`}
              color={
                candidate.suitability_score >= 80
                  ? "success"
                  : candidate.suitability_score >= 50
                  ? "warning"
                  : "error"
              }
            />
          </Box>
        </Box>

        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Recommendation: <strong>{candidate.recommendation}</strong>
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" paragraph>{candidate.summary}</Typography>

        <Typography variant="subtitle2" gutterBottom>
          Strengths:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {candidate.strengths?.map((s, i) => (
            <Chip key={i} label={s} color="success" size="small" />
          ))}
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Weaknesses:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {candidate.weaknesses?.map((w, i) => (
            <Chip key={i} label={w} color="error" size="small" />
          ))}
        </Box>

        {candidate.improvement_suggestions && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Improvement Suggestions:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              {candidate.improvement_suggestions.map((s, i) => (
                <Box component="li" key={i}>
                  <Typography variant="body2">{s}</Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </CardContent>

      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          fullWidth
          href={downloadUrl}
          startIcon={<DownloadIcon />}
          download
        >
          Download Resume
        </Button>
      </Box>
    </Card>
  );
};

export default Results;
