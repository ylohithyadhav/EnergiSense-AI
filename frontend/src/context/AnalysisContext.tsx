import React, { createContext, useContext, useState } from 'react';
import {
  DatasetUploadResponse,
  TrainResponse,
  AnomalyDetectResponse,
  SHAPExplainResponse
} from '../types';

interface AnalysisContextType {
  activeUpload: DatasetUploadResponse | null;
  setActiveUpload: (upload: DatasetUploadResponse | null) => void;
  activeTrain: TrainResponse | null;
  setActiveTrain: (train: TrainResponse | null) => void;
  activeAnomaly: AnomalyDetectResponse | null;
  setActiveAnomaly: (anomaly: AnomalyDetectResponse | null) => void;
  activeSHAP: SHAPExplainResponse | null;
  setActiveSHAP: (shap: SHAPExplainResponse | null) => void;
  resetAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUpload, setActiveUpload] = useState<DatasetUploadResponse | null>(null);
  const [activeTrain, setActiveTrain] = useState<TrainResponse | null>(null);
  const [activeAnomaly, setActiveAnomaly] = useState<AnomalyDetectResponse | null>(null);
  const [activeSHAP, setActiveSHAP] = useState<SHAPExplainResponse | null>(null);

  const resetAnalysis = () => {
    setActiveUpload(null);
    setActiveTrain(null);
    setActiveAnomaly(null);
    setActiveSHAP(null);
  };

  return (
    <AnalysisContext.Provider
      value={{
        activeUpload,
        setActiveUpload,
        activeTrain,
        setActiveTrain,
        activeAnomaly,
        setActiveAnomaly,
        activeSHAP,
        setActiveSHAP,
        resetAnalysis
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
