export interface AnalysisResponse {
  success: boolean;
  analysis: string;
  request_id: string;
  timestamp: string;
  processed_files: number;
}
