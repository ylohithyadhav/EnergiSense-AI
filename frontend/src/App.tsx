import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { DatasetUpload } from './pages/DatasetUpload';
import { EnergyPrediction } from './pages/EnergyPrediction';
import { AnomalyDetection } from './pages/AnomalyDetection';
import { AnomalyDetails } from './pages/AnomalyDetails';
import { ExplainableAI } from './pages/ExplainableAI';
import { ResearchBenchmark } from './pages/ResearchBenchmark';
import { AnalysisHistory } from './pages/AnalysisHistory';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AnalysisProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes enclosed in Layout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/upload" element={<DatasetUpload />} />
                  <Route path="/predict" element={<EnergyPrediction />} />
                  <Route path="/anomalies" element={<AnomalyDetection />} />
                  <Route path="/anomalies/details" element={<AnomalyDetails />} />
                  <Route path="/explainable-ai" element={<ExplainableAI />} />
                  <Route path="/benchmark" element={<ResearchBenchmark />} />
                  <Route path="/history" element={<AnalysisHistory />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AnalysisProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
