# EnergiSense AI
**A Regime-Aware Explainable Machine Learning Framework for Energy Prediction and Anomaly Detection in Smart Buildings**

> *"Predict Smart. Detect Early. Save Energy."*  
> **Final-Year B.Tech Computer Science & Engineering Capstone Project**  
> **Target Deployment Budget:** ₹0 (100% Free-Tier Cloud Architecture)

---

## 🏢 Table of Contents
1. [Project Overview](#-project-overview)
2. [System Architecture](#-system-architecture)
3. [Technology Stack](#-technology-stack)
4. [Zero-Cost (₹0) Cloud Hosting Analysis](#-zero-cost-0-cloud-hosting-analysis)
5. [Project Directory Structure](#-project-directory-structure)
6. [Machine Learning & Anomaly Detection Methodology](#-machine-learning--anomaly-detection-methodology)
7. [Explainable AI (SHAP TreeExplainer)](#-explainable-ai-shap-treeexplainer)
8. [LEAD 1.0 Research Benchmark](#-lead-10-research-benchmark)
9. [Step-by-Step Setup Guide (Beginner Friendly)](#-step-by-step-setup-guide-beginner-friendly)
   - [Part 1: Firebase Setup](#part-1-firebase-setup-auth--firestore)
   - [Part 2: Local Development & Testing](#part-2-local-development--testing)
   - [Part 3: Backend Deployment (Render Free Web Service)](#part-3-backend-deployment-render-free-web-service)
   - [Part 4: Frontend Deployment (Firebase Hosting)](#part-4-frontend-deployment-firebase-hosting)
10. [Verification & Post-Deployment Testing](#-verification--post-deployment-testing)
11. [Troubleshooting & Limitations](#-troubleshooting--limitations)

---

## 🌟 Project Overview
Commercial and institutional smart buildings represent a major portion of global electric power consumption. Due to fluctuating weather patterns, changing occupancy dynamics, and distinct operational regimes (e.g., peak business hours, overnight baseloads, and weekend schedules), standard anomaly detection techniques suffer from high false-alarm rates or miss subtle off-hours equipment runaways.

**EnergiSense AI** solves this with an end-to-end full-stack framework:
1. **LightGBM Gradient Boosting Regression:** Accurately forecasts hourly electrical load without temporal data leakage.
2. **Four Comparative Anomaly Detection Engines:**
   - **Method 1:** Global Residual Threshold
   - **Method 2:** Rolling Residual Threshold (Strictly past windows)
   - **Method 3:** Isolation Forest (Multivariate tree partitioning)
   - **Method 4:** **Proposed Regime-Aware Adaptive Method** (Statistical residual thresholds calibrated per operational state)
3. **Explainable AI with SHAP:** Real TreeExplainer computing Shapley additive feature attributions for transparency.
4. **Cloud Integration:** Secure Firebase Authentication and Cloud Firestore analysis history.
5. **No Localhost Dependency:** Designed to run 24/7 online on free cloud tiers.

---

## 🏛 System Architecture

```text
                                  USER BROWSER
                                        │
                                        ▼
                        PUBLIC HTTPS FRONTEND (React + Vite)
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
           FIREBASE AUTHENTICATION               FASTAPI PYTHON BACKEND
       (JWT Token Verification)                  (Render Free Service)
                     │                                     │
                     │                           ┌─────────┴─────────┐
                     │                           ▼                   ▼
                     │                     CSV INGESTION        DATA VALIDATION
                     │                           │                   │
                     │                           ▼                   ▼
                     │                    LIGHTGBM MODEL      FEATURE ENCODING
                     │                           │                   │
                     │                           ▼                   ▼
                     │                    LOAD PREDICTION     RESIDUAL ENGINE
                     │                           │                   │
                     │                           ▼                   ▼
                     │                   REGIME-AWARE ANOMALY DETECTION
                     │                           │
                     │                           ▼
                     │                   SHAP TREEEXPLAINER
                     │                           │
                     ▼                           ▼
            CLOUD FIRESTORE ◄────────── HISTORICAL RECORDS
       (Analyses & Evaluations)
```

---

## 💻 Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Bundler:** Vite 5
- **Styling:** Tailwind CSS (Navy / Slate / Emerald / Amber / Rose theme)
- **Routing:** React Router v6
- **Data Visualizations:** Recharts (Interactive Line, Bar, and Pie Charts)
- **Icons:** Lucide React
- **Authentication SDK:** Firebase JavaScript SDK v10

### Backend
- **Web API:** FastAPI & Uvicorn ASGI
- **Data Processing:** Pandas & NumPy
- **Machine Learning:** LightGBM 4.3 (Gradient Boosted Decision Trees)
- **Anomaly Detection:** Scikit-learn (Isolation Forest & dynamic statistical filters)
- **Model Explainability:** SHAP 0.45 (TreeExplainer)
- **Cloud Administration:** Firebase Admin SDK
- **Testing:** Pytest & HTTPX TestClient

### Cloud Infrastructure (₹0 Cost Plan)
- **Frontend Hosting:** Firebase Hosting (Static HTTPS CDN)
- **ML Backend:** Render Free Web Service
- **Authentication:** Firebase Authentication (Spark Plan)
- **Database:** Cloud Firestore (Spark Plan)

---

## 💰 Zero-Cost (₹0) Cloud Hosting Analysis

All services used have been validated under their **free-tier limits without requiring a credit card or paid billing account**:

| Service | Free Tier Allocation | EnergiSense AI Usage | Cost |
| :--- | :--- | :--- | :--- |
| **Firebase Auth** | 50,000 Monthly Active Users | ~100 student / examiner accounts | **₹0.00** |
| **Cloud Firestore** | 1 GB storage, 50,000 reads/day, 20,000 writes/day | ~5 MB metadata and evaluation history | **₹0.00** |
| **Firebase Hosting** | 10 GB storage, 360 MB/day transfer | ~1.5 MB static bundle | **₹0.00** |
| **Render Web Service** | 512 MB RAM, 0.1 CPU, 750 free instance hrs/mo | Lightweight FastAPI ML inference | **₹0.00** |

> **Note on Render Cold Starts:** The free tier of Render spins down inactive instances after 15 minutes of zero traffic. When woken up by a new request, it takes approximately 30–50 seconds to initialize. The frontend includes automatic status checking and user guidance to handle this gracefully.

---

## 📂 Project Directory Structure

```text
EnergiSense-AI/
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   └── data/
│   │       └── sample_energy_data.csv
│   ├── src/
│   │   ├── components/
│   │   │   ├── KPICard.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── context/
│   │   │   ├── AnalysisContext.tsx
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── AnalysisHistory.tsx
│   │   │   ├── AnomalyDetails.tsx
│   │   │   ├── AnomalyDetection.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DatasetUpload.tsx
│   │   │   ├── EnergyPrediction.tsx
│   │   │   ├── ExplainableAI.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── NotFound.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ResearchBenchmark.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── firebase.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   ├── auth.py
│   │   │   └── config.py
│   │   ├── models/
│   │   │   └── lgbm_pipeline.py
│   │   ├── schemas/
│   │   │   └── analysis_schemas.py
│   │   ├── services/
│   │   │   ├── anomaly_service.py
│   │   │   ├── csv_service.py
│   │   │   ├── firestore_backend.py
│   │   │   └── shap_service.py
│   │   └── main.py
│   ├── tests/
│   │   ├── test_anomaly_detection.py
│   │   ├── test_api_routes.py
│   │   ├── test_csv_validation.py
│   │   ├── test_health.py
│   │   ├── test_ml_pipeline.py
│   │   └── test_shap.py
│   ├── Dockerfile
│   ├── Procfile
│   ├── render.yaml
│   ├── requirements.txt
│   ├── runtime.txt
│   └── .env.example
├── firebase/
│   └── firestore.rules
├── data/
│   ├── generate_sample_data.py
│   └── sample_energy_data.csv
├── firebase.json
├── README.md
└── .gitignore
```

---

## 🔬 Machine Learning & Anomaly Detection Methodology

### 1. Chronological Splitting & Leakage Prevention
Energy load forecasting is a continuous time-series process. Traditional random k-fold cross-validation results in severe data leakage because future observations leak into past predictions.
- **Strict Chronological Sequence:** Data is sorted by timestamp.
- **Partitions:** 70% Training $\rightarrow$ 15% Validation $\rightarrow$ 15% Testing.
- **Zero Leakage:** Imputers, categorical encoders, and threshold distributions are calibrated solely on training and validation periods.

### 2. Four Anomaly Detection Algorithms
Residual is calculated as:
$$\text{Residual} = \text{Actual Energy} - \text{Predicted Energy}$$

1. **Method 1: Global Residual Threshold**
   - Applies a static threshold $\mu_e + k \cdot \sigma_e$ computed from validation residuals across the entire dataset.
2. **Method 2: Rolling Residual Threshold**
   - Calculates dynamic rolling mean and standard deviation across trailing $W$ hours (e.g., 24-hour window) strictly using past observations.
3. **Method 3: Isolation Forest**
   - Unsupervised multidimensional isolation trees identifying points that require fewer random partitions to isolate.
4. **Method 4: Proposed Regime-Aware Adaptive Method**
   - Categorizes each observation into a physical operating regime (e.g., `Occupied_Peak_HighCooling`, `Unoccupied_Night_Moderate`, `Weekend_Moderate`).
   - Calibrates regime-specific residual thresholds $\mu_r + k \cdot \sigma_r$ on validation data.
   - **Key Advantage:** Drastically reduces false alarms during high-occupancy heatwaves while sensitively detecting night and weekend baseline schedule leaks.

---

## 🧠 Explainable AI (SHAP TreeExplainer)
SHAP uses cooperative game theory (Shapley values) to fairly apportion the difference between the model's expected baseline load and the actual predicted load across all input variables:
- **Global Feature Importance:** Mean absolute Shapley values revealing overall drivers.
- **Local Instance Breakdown:** Bar push charts highlighting whether temperature, occupancy, solar radiation, or time of day pushed the prediction up or down.
- **Interpretability Disclaimer:** SHAP explains computational model behavior; it does not replace physical on-site mechanical inspection by building engineers.

---

## 📊 LEAD 1.0 Research Benchmark

Reference results previously reported on the LEAD 1.0 benchmark dataset (first 30 deterministically sorted buildings, 198,030 observations, 29,698 test records, 2.92% anomaly prevalence):

### Energy Prediction Performance
| Architecture | MAE (kWh) | RMSE (kWh) |
| :--- | :--- | :--- |
| **LightGBM (Proposed Pipeline)** | **6.005** | **12.818** |
| Persistence Baseline | 7.363 | 16.615 |

### Anomaly Detection Comparison
| Method | Precision (↑) | Recall (↑) | F1-Score (↑) | PR-AUC (↑) | ROC-AUC (↑) | False Positives / 1k Normals (↓) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Global Residual | 0.293 | 0.141 | 0.190 | 0.152 | 0.697 | 10.23 |
| Rolling Residual | 0.220 | 0.075 | 0.112 | 0.091 | 0.655 | 8.01 |
| Isolation Forest | 0.301 | **0.189** | **0.232** | **0.193** | 0.682 | 13.22 |
| **Proposed Regime-Aware Adaptive** | **0.372** | 0.128 | 0.190 | 0.181 | **0.722** | **6.49** |

*Analysis Note:* The proposed method achieves the highest precision (0.372), highest ROC-AUC (0.722), and lowest false-positive rate (6.49 per 1,000 normal intervals). Isolation Forest achieves higher recall (0.189) and F1-score (0.232) at the expense of more than double the false-alarm rate.

---

## 🚀 Step-by-Step Setup Guide (Beginner Friendly)

### Part 1: Firebase Setup (Auth & Firestore)
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Name your project (e.g., `energisense-ai-final`). Disable Google Analytics if prompted (not required).
3. **Enable Authentication:**
   - Go to **Build $\rightarrow$ Authentication $\rightarrow$ Get Started**.
   - Under the **Sign-in method** tab, enable **Email/Password**.
4. **Enable Cloud Firestore:**
   - Go to **Build $\rightarrow$ Firestore Database $\rightarrow$ Create Database**.
   - Choose location (e.g., `asia-south1` or `us-central1`).
   - Start in **Production mode** (our `firebase/firestore.rules` file configures security).
5. **Register Web App:**
   - Click the gear icon $\rightarrow$ **Project settings $\rightarrow$ General**.
   - Scroll down to "Your apps", click the **Web icon (`</>`)**, and name it `EnergiSense Web`.
   - Copy the `firebaseConfig` keys into `frontend/.env`:
     ```env
     VITE_FIREBASE_API_KEY=AIzaSy...
     VITE_FIREBASE_AUTH_DOMAIN=energisense-ai-final.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=energisense-ai-final
     VITE_FIREBASE_STORAGE_BUCKET=energisense-ai-final.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=...
     VITE_FIREBASE_APP_ID=...
     ```

---

### Part 2: Local Development & Testing

Open **Windows PowerShell** in the project directory:

#### 1. Backend Setup & Run
```powershell
# Navigate to backend
cd "c:\Users\Lokesh Yarrani\OneDrive\Desktop\EnergiSense AI\backend"

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Run automated tests
pytest tests -v

# Start FastAPI local server
uvicorn app.main:app --reload --port 8000
```
API Documentation will be accessible at: `http://127.0.0.1:8000/docs`

#### 2. Frontend Setup & Run
Open a second PowerShell window:
```powershell
# Navigate to frontend
cd "c:\Users\Lokesh Yarrani\OneDrive\Desktop\EnergiSense AI\frontend"

# Build production check
npm run build

# Start local development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

### Part 3: Backend Deployment (Render Free Web Service)

1. Create a free account at [Render](https://render.com/).
2. Push your project code to a GitHub repository:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit of EnergiSense AI"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/EnergiSense-AI.git
   git push -u origin main
   ```
3. In Render Dashboard, click **New + $\rightarrow$ Web Service**.
4. Connect your GitHub repository.
5. Fill in the deployment settings:
   - **Name:** `energisense-ai-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free` (₹0 / month)
6. Under **Environment Variables**, add:
   - `ENVIRONMENT` = `production`
   - `MAX_UPLOAD_SIZE_MB` = `50`
   - `ALLOWED_ORIGINS` = `*`
7. Click **Create Web Service**. Once deployed, Render provides your permanent public HTTPS URL (e.g., `https://energisense-ai-backend.onrender.com`).

---

### Part 4: Frontend Deployment (Firebase Hosting)

1. In `frontend/.env`, set your deployed Render backend URL:
   ```env
   VITE_API_BASE_URL=https://energisense-ai-backend.onrender.com
   ```
2. Build the production bundle:
   ```powershell
   cd frontend
   npm run build
   cd ..
   ```
3. Install Firebase CLI (if not already installed) and log in:
   ```powershell
   npm install -g firebase-tools
   firebase login
   ```
4. Deploy the frontend and Firestore rules:
   ```powershell
   firebase deploy --only hosting,firestore:rules
   ```
5. Firebase will provide your live public HTTPS URL (e.g., `https://energisense-ai-final.web.app`).

---

## ✅ Verification & Post-Deployment Testing

Once online, perform this 10-point verification checklist:

1. [x] **Public URL Access:** Open the HTTPS website from any computer or smartphone.
2. [x] **No Localhost:** Ensure your local computer terminal is closed and the app remains fully responsive.
3. [x] **Account Registration:** Register an email account via Firebase Authentication.
4. [x] **Dataset Ingestion:** In **Dataset Upload**, click **Load Synthetic Demo Dataset** or upload your custom CSV.
5. [x] **Column Mapping:** Ensure timestamp, building ID, energy target, and input features are identified.
6. [x] **LightGBM Prediction:** Run the chronological training pipeline; inspect test MAE and RMSE KPI cards.
7. [x] **Multi-Method Detection:** Run all 4 anomaly detection methods; verify method comparison table.
8. [x] **SHAP Explainability:** View global feature importance and examine local instance waterfall contributions.
9. [x] **CSV Export:** Click **Export Anomaly Report** to download results.
10. [x] **Firestore Persistence:** Navigate to **Analysis History** to ensure the analysis record was persisted.

---

## 🛠 Troubleshooting & Limitations

- **Render Cold Starts:**
  Render's free web service spins down after 15 minutes of inactivity. When accessed after idle time, allow 30–50 seconds for the container to wake up. The EnergiSense AI navbar contains an automatic status indicator that alerts you when a cold start is occurring.
- **Large Dataset Memory Constraints:**
  Free Render instances have 512 MB of RAM. Datasets should ideally be under 50,000 rows for real-time SHAP TreeExplainer calculation to prevent Out-Of-Memory (OOM) kill events.
- **Strict Firestore Security:**
  User analyses are strictly isolated per `userId`. Ensure you are logged in to save and retrieve past analyses.

---

## 📜 License & Academic Integrity
Developed as a B.Tech Computer Science and Engineering Capstone Project. The reference research benchmark figures are sourced from published literature on the LEAD 1.0 dataset and are clearly identified throughout the application.
