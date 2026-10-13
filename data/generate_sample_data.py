"""
EnergiSense AI - Synthetic Smart Building Energy Dataset Generator
Generates realistic building energy data with weather variables, occupancy profiles,
operating regimes, and injected anomalies (approx 3% prevalence matching LEAD 1.0 benchmarks).
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_energy_dataset(n_days=60, seed=42):
    np.random.seed(seed)
    
    buildings = [
        {"id": "Building_Admin_101", "base_load": 45.0, "occupancy_mult": 55.0, "temp_sens": 2.2},
        {"id": "Building_Lab_202", "base_load": 90.0, "occupancy_mult": 40.0, "temp_sens": 3.0},
        {"id": "Building_Library_303", "base_load": 30.0, "occupancy_mult": 45.0, "temp_sens": 1.8},
        {"id": "Building_Classroom_404", "base_load": 25.0, "occupancy_mult": 60.0, "temp_sens": 2.0},
        {"id": "Building_DataCenter_505", "base_load": 150.0, "occupancy_mult": 15.0, "temp_sens": 4.5},
    ]
    
    start_time = datetime(2024, 1, 1, 0, 0, 0)
    timestamps = [start_time + timedelta(hours=i) for i in range(n_days * 24)]
    
    all_rows = []
    
    for b in buildings:
        b_id = b["id"]
        base_load = b["base_load"]
        occ_mult = b["occupancy_mult"]
        temp_sens = b["temp_sens"]
        
        for t in timestamps:
            hour = t.hour
            weekday = t.weekday() # 0 = Monday, 6 = Sunday
            is_weekend = 1 if weekday >= 5 else 0
            
            # Weather simulation
            # Diurnal temperature cycle: coolest at 5am, warmest at 2pm (14:00)
            daily_temp_cycle = 8.0 * np.sin((hour - 8) / 24.0 * 2 * np.pi)
            seasonal_drift = 5.0 * np.sin((t.timetuple().tm_yday / 365.0) * 2 * np.pi)
            ambient_temp = 20.0 + daily_temp_cycle + seasonal_drift + np.random.normal(0, 1.2)
            
            # Humidity inversely correlated with temp
            humidity = np.clip(65.0 - 1.5 * daily_temp_cycle + np.random.normal(0, 3.0), 20.0, 95.0)
            
            # Wind speed
            wind_speed = np.clip(np.random.rayleigh(scale=3.0), 0.5, 18.0)
            
            # Solar radiation: positive only between 06:00 and 18:00
            if 6 <= hour <= 18:
                solar_radiation = np.clip(800.0 * np.sin((hour - 6) / 12.0 * np.pi) + np.random.normal(0, 40.0), 0, 1000)
            else:
                solar_radiation = 0.0
                
            # Occupancy model
            if is_weekend:
                occupancy = np.clip(np.random.uniform(0.02, 0.10), 0, 1)
            else:
                if 8 <= hour <= 18:
                    # Business hours bell curve
                    occ_peak = np.sin((hour - 8) / 10.0 * np.pi)
                    occupancy = np.clip(0.3 + 0.65 * occ_peak + np.random.normal(0, 0.05), 0, 1)
                elif (6 <= hour < 8) or (18 < hour <= 21):
                    occupancy = np.clip(np.random.uniform(0.1, 0.25), 0, 1)
                else:
                    occupancy = np.clip(np.random.uniform(0.01, 0.05), 0, 1)
                    
            # Cooling / heating demand effect
            cooling_demand = max(0, ambient_temp - 22.0) * temp_sens
            heating_demand = max(0, 16.0 - ambient_temp) * (temp_sens * 0.8)
            
            # Normal clean energy consumption
            energy = (
                base_load 
                + occ_mult * occupancy 
                + cooling_demand 
                + heating_demand 
                + (solar_radiation * 0.01) 
                + np.random.normal(0, 1.5)
            )
            
            anomaly_flag = 0
            
            # Realistic Anomaly Injection (~2.9% prevalence)
            # Scenario A: Unexpected Midnight HVAC Runaway (equipment schedule fault)
            if (hour in [1, 2, 3]) and (np.random.random() < 0.018):
                energy += base_load * np.random.uniform(0.9, 1.6)
                anomaly_flag = 1
                
            # Scenario B: High peak-hour Chiller Failure / Efficiency degradation
            elif (12 <= hour <= 15) and (ambient_temp > 24) and (np.random.random() < 0.018):
                energy += base_load * np.random.uniform(1.2, 2.0)
                anomaly_flag = 1
                
            # Scenario C: Weekend lighting/plug-load left running at 100%
            elif is_weekend and (10 <= hour <= 16) and (np.random.random() < 0.015):
                energy += occ_mult * 0.85
                anomaly_flag = 1

            all_rows.append({
                "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
                "building_id": b_id,
                "energy_kwh": round(float(max(1.0, energy)), 2),
                "air_temperature": round(float(ambient_temp), 2),
                "relative_humidity": round(float(humidity), 2),
                "wind_speed": round(float(wind_speed), 2),
                "solar_radiation": round(float(solar_radiation), 2),
                "occupancy_rate": round(float(occupancy), 3),
                "is_weekend": int(is_weekend),
                "ground_truth_anomaly": int(anomaly_flag)
            })

    df = pd.DataFrame(all_rows)
    return df

if __name__ == "__main__":
    df = generate_energy_dataset(n_days=30, seed=42)
    output_path = "data/sample_energy_data.csv"
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} rows across {df['building_id'].nunique()} buildings.")
    print(f"Anomaly count: {df['ground_truth_anomaly'].sum()} ({df['ground_truth_anomaly'].mean()*100:.2f}%)")
    print(f"Saved to {output_path}")
