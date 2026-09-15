use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StopInput {
    pub id: String,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OptimizationOutput {
    pub optimized_ids: Vec<String>,
    pub original_duration_mins: u32,
    pub optimized_duration_mins: u32,
    pub minutes_saved: u32,
    pub total_distance_km: f64,
}

/// Great-circle Haversine formula computed in native WebAssembly
#[wasm_bindgen]
pub fn wasm_haversine_distance_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6371.0; // Earth radius in km
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let r_lat1 = lat1.to_radians();
    let r_lat2 = lat2.to_radians();

    let a = (d_lat / 2.0).sin().powi(2)
        + r_lat1.cos() * r_lat2.cos() * (d_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    
    (r * c * 10.0).round() / 10.0
}

/// Estimates duration in minutes based on distance and transit mode
#[wasm_bindgen]
pub fn wasm_estimate_duration_minutes(distance_km: f64, mode: &str) -> u32 {
    let road_dist = distance_km * 1.25; // Urban grid winding factor
    match mode {
        "walk" => {
            let mins = (road_dist / 4.5) * 60.0;
            mins.round().max(3.0) as u32
        }
        "transit" => {
            let mins = (road_dist / 30.0) * 60.0 + 5.0; // Wait buffer
            mins.round().max(6.0) as u32
        }
        "drive" | _ => {
            let mins = (road_dist / 24.0) * 60.0 + 2.0; // Traffic buffer
            mins.round().max(4.0) as u32
        }
    }
}

fn calculate_total_route_duration(stops: &[StopInput], mode: &str) -> (u32, f64) {
    if stops.len() < 2 {
        return (0, 0.0);
    }
    let mut total_mins = 0;
    let mut total_dist = 0.0;

    for i in 0..stops.len() - 1 {
        let dist = wasm_haversine_distance_km(
            stops[i].latitude,
            stops[i].longitude,
            stops[i + 1].latitude,
            stops[i + 1].longitude,
        );
        total_dist += dist;
        total_mins += wasm_estimate_duration_minutes(dist, mode);
    }

    (total_mins, (total_dist * 10.0).round() / 10.0)
}

/// 2-opt Traveling Salesperson Problem (TSP) solver executed in WASM
/// Preserves index 0 (Start Anchor) while optimizing intermediate sequence
#[wasm_bindgen]
pub fn wasm_optimize_route_tsp(stops_json: &str, mode: &str) -> String {
    let stops: Vec<StopInput> = match serde_json::from_str(stops_json) {
        Ok(s) => s,
        Err(e) => return format!("{{\"error\":\"Invalid JSON: {}\"}}", e),
    };

    if stops.len() <= 2 {
        let (dur, dist) = calculate_total_route_duration(&stops, mode);
        let ids: Vec<String> = stops.iter().map(|s| s.id.clone()).collect();
        let res = OptimizationOutput {
            optimized_ids: ids,
            original_duration_mins: dur,
            optimized_duration_mins: dur,
            minutes_saved: 0,
            total_distance_km: dist,
        };
        return serde_json::to_string(&res).unwrap_or_default();
    }

    let (orig_duration, _) = calculate_total_route_duration(&stops, mode);
    let mut current = stops.clone();
    let n = current.len();

    let mut improved = true;
    let mut passes = 0;
    let max_passes = 100;

    while improved && passes < max_passes {
        improved = false;
        passes += 1;

        for i in 1..n - 1 {
            for j in i + 1..n {
                let mut candidate = current.clone();
                candidate[i..=j].reverse();

                let (cand_dur, _) = calculate_total_route_duration(&candidate, mode);
                let (curr_dur, _) = calculate_total_route_duration(&current, mode);

                if cand_dur < curr_dur {
                    current = candidate;
                    improved = true;
                }
            }
        }
    }

    let (opt_duration, opt_dist) = calculate_total_route_duration(&current, mode);
    let saved = if orig_duration > opt_duration {
        orig_duration - opt_duration
    } else {
        0
    };

    let ids: Vec<String> = current.iter().map(|s| s.id.clone()).collect();
    let res = OptimizationOutput {
        optimized_ids: ids,
        original_duration_mins: orig_duration,
        optimized_duration_mins: opt_duration,
        minutes_saved: saved,
        total_distance_km: opt_dist,
    };

    serde_json::to_string(&res).unwrap_or_default()
}

/// Weather Comfort Index computed in Rust
#[wasm_bindgen]
pub fn wasm_weather_comfort_label(temp_c: f64, humidity: f64, rain_chance: f64) -> String {
    if rain_chance >= 60.0 {
        return "Rain gear essential · Wet conditions".to_string();
    }
    if temp_c >= 28.0 && humidity >= 65.0 {
        return "High heat index · Stay hydrated".to_string();
    }
    if temp_c <= 12.0 {
        return "Crisp & cool · Warm layers recommended".to_string();
    }
    if temp_c >= 18.0 && temp_c <= 24.0 && rain_chance <= 20.0 {
        return "Ideal travel weather · Perfect for walking".to_string();
    }
    "Mild conditions · Comfortable for exploration".to_string()
}
