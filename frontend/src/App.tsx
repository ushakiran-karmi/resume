import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FileUpload from "./FileUpload";
import Results from "./Results";
import ErrorBoundary from "./ErrorBoundary"; // adjust path if needed

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FileUpload />} />
        <Route 
          path="/results" 
          element={
            <ErrorBoundary>
              <Results />
            </ErrorBoundary>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
