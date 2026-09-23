use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

    let n = stops.len();

    // Precompute duration and distance matrices to eliminate repeated Haversine trigonometry
    let mut dur_matrix = vec![0u32; n * n];
    let mut dist_matrix = vec![0.0f64; n * n];

    for i in 0..n {
        for j in (i + 1)..n {
            let dist = wasm_haversine_distance_km(
                stops[i].latitude,
                stops[i].longitude,
                stops[j].latitude,
                stops[j].longitude,
            );
            let dur = wasm_estimate_duration_minutes(dist, mode);
            dist_matrix[i * n + j] = dist;
            dist_matrix[j * n + i] = dist;
            dur_matrix[i * n + j] = dur;
            dur_matrix[j * n + i] = dur;
        }
    }

    let mut route: Vec<usize> = (0..n).collect();
    let mut orig_duration = 0u32;
    for idx in 0..n - 1 {
        orig_duration += dur_matrix[route[idx] * n + route[idx + 1]];
    }

    let mut current_duration = orig_duration;
    let mut improved = true;
    let mut passes = 0;
    let max_passes = 100;

    // O(1) delta evaluation per candidate swap: eliminates heap allocations and full route recalculations
    while improved && passes < max_passes {
        improved = false;
        passes += 1;

        for i in 1..n - 1 {
            for j in i + 1..n {
                let u = route[i - 1];
                let v = route[i];
                let w = route[j];

                let (old_cost, new_cost) = if j < n - 1 {
                    let x = route[j + 1];
                    (
                        dur_matrix[u * n + v] + dur_matrix[w * n + x],
                        dur_matrix[u * n + w] + dur_matrix[v * n + x],
                    )
                } else {
                    (
                        dur_matrix[u * n + v],
                        dur_matrix[u * n + w],
                    )
                };

                if new_cost < old_cost {
                    current_duration = current_duration - old_cost + new_cost;
                    route[i..=j].reverse();
                    improved = true;
                }
            }
        }
    }

    let mut opt_dist = 0.0;
    for idx in 0..n - 1 {
        opt_dist += dist_matrix[route[idx] * n + route[idx + 1]];
    }
    let opt_dist = (opt_dist * 10.0).round() / 10.0;
    let opt_duration = current_duration;
    let saved = if orig_duration > opt_duration {
        orig_duration - opt_duration
    } else {
        0
    };

    let ids: Vec<String> = route.iter().map(|&idx| stops[idx].id.clone()).collect();
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

// =========================================================================
// RUSTIFIED EXTENSIONS: BATCH TRANSIT, GPX GENERATOR, & EXPENSE ANALYTICS
// =========================================================================

#[derive(Serialize, Deserialize, Debug)]
pub struct TransitLegOutput {
    pub from_stop_id: String,
    pub to_stop_id: String,
    pub mode: String,
    pub distance_km: f64,
    pub duration_minutes: u32,
    pub is_outlier: bool,
}

#[derive(Deserialize)]
struct StopCoordInput {
    id: String,
    latitude: f64,
    longitude: f64,
}

/// Batch computes multi-modal transit legs for an entire day sequence in a single WASM call
#[wasm_bindgen]
pub fn wasm_compute_transit_legs(stops_json: &str, modes_json: &str) -> String {
    let stops: Vec<StopCoordInput> = match serde_json::from_str(stops_json) {
        Ok(s) => s,
        Err(e) => return format!("{{\"error\":\"{}\"}}", e),
    };

    let modes: HashMap<String, String> = serde_json::from_str(modes_json).unwrap_or_default();

    if stops.len() < 2 {
        return "[]".to_string();
    }

    let mut legs: Vec<TransitLegOutput> = Vec::with_capacity(stops.len() - 1);

    for i in 0..stops.len() - 1 {
        let from = &stops[i];
        let to = &stops[i + 1];
        let leg_key = format!("{}->{}", from.id, to.id);
        let mode = modes.get(&leg_key).map(|s| s.as_str()).unwrap_or("drive");

        let dist = wasm_haversine_distance_km(from.latitude, from.longitude, to.latitude, to.longitude);
        let duration = wasm_estimate_duration_minutes(dist, mode);
        let is_outlier = duration > 45 || dist > 20.0;

        legs.push(TransitLegOutput {
            from_stop_id: from.id.clone(),
            to_stop_id: to.id.clone(),
            mode: mode.to_string(),
            distance_km: dist,
            duration_minutes: duration,
            is_outlier,
        });
    }

    serde_json::to_string(&legs).unwrap_or_else(|_| "[]".to_string())
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// Formats decimal coordinates into human-readable lat/lon notation
#[wasm_bindgen]
pub fn wasm_format_gpx_coordinate(lat: f64, lon: f64) -> String {
    let lat_dir = if lat >= 0.0 { "N" } else { "S" };
    let lon_dir = if lon >= 0.0 { "E" } else { "W" };
    format!("{:.4}° {}, {:.4}° {}", lat.abs(), lat_dir, lon.abs(), lon_dir)
}

#[derive(Deserialize)]
struct GpxStopInput {
    pub title: String,
    pub subtitle: Option<String>,
    pub category: Option<String>,
    pub start_time: Option<String>,
    pub address: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Deserialize)]
struct GpxDayInput {
    pub day_number: u32,
    pub title: String,
    pub date_str: String,
    pub stops: Vec<GpxStopInput>,
}

/// High-speed RFC/Topografix compliant GPX 1.1 XML generation compiled in Rust WASM
#[wasm_bindgen]
pub fn wasm_generate_day_gpx(day_json: &str, trip_title: &str) -> String {
    let day: GpxDayInput = match serde_json::from_str(day_json) {
        Ok(d) => d,
        Err(e) => return format!("<!-- Error parsing GPX JSON: {} -->", e),
    };

    let esc_trip_title = escape_xml(trip_title);
    let esc_day_title = escape_xml(&day.title);
    let esc_date_str = escape_xml(&day.date_str);

    let mut waypoints_xml = String::new();
    let total_stops = day.stops.len();

    for (index, stop) in day.stops.iter().enumerate() {
        let is_start = index == 0;
        let is_finish = index == total_stops - 1 && total_stops > 1;
        let tag = if is_start {
            "START".to_string()
        } else if is_finish {
            "FINISH".to_string()
        } else {
            format!("WPT {}", index + 1)
        };

        let name = escape_xml(&format!("{}: {}", tag, stop.title));
        let subtitle = stop.subtitle.as_deref().unwrap_or("");
        let address = stop.address.as_deref().unwrap_or("");
        let start_time = stop.start_time.as_deref().unwrap_or("");
        let desc = escape_xml(&format!("{} | {} ({})", subtitle, address, start_time));
        let cat = escape_xml(stop.category.as_deref().unwrap_or("waypoint"));

        waypoints_xml.push_str(&format!(
            "  <wpt lat=\"{:.6}\" lon=\"{:.6}\">\n    <name>{}</name>\n    <desc>{}</desc>\n    <sym>{}</sym>\n    <type>{}</type>\n  </wpt>\n",
            stop.latitude, stop.longitude, name, desc, cat, cat
        ));
    }

    let mut track_points_xml = String::new();
    for stop in &day.stops {
        let esc_name = escape_xml(&stop.title);
        track_points_xml.push_str(&format!(
            "      <trkpt lat=\"{:.6}\" lon=\"{:.6}\">\n        <name>{}</name>\n      </trkpt>\n",
            stop.latitude, stop.longitude, esc_name
        ));
    }

    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="roammate / TerraWay Engine" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>{} — Day {}: {}</name>
    <desc>{} route track and waypoints</desc>
  </metadata>
{}  <trk>
    <name>Day {} Route Track</name>
    <trkseg>
{}    </trkseg>
  </trk>
</gpx>"#,
        esc_trip_title, day.day_number, esc_day_title, esc_date_str, waypoints_xml, day.day_number, track_points_xml
    )
}

#[derive(Serialize, Deserialize)]
struct ExpenseItemInput {
    pub category: String,
    pub amount: f64,
}

#[derive(Serialize)]
pub struct CategoryTotal {
    pub category: String,
    pub amount: f64,
    pub percentage: f64,
}

#[derive(Serialize)]
pub struct ExpenseBreakdownOutput {
    pub total_spent: f64,
    pub category_totals: Vec<CategoryTotal>,
    pub highest_category: String,
    pub expense_count: usize,
}

/// Performs financial reduction & category breakdown in native Rust WebAssembly
#[wasm_bindgen]
pub fn wasm_compute_expense_breakdown(expenses_json: &str) -> String {
    let expenses: Vec<ExpenseItemInput> = match serde_json::from_str(expenses_json) {
        Ok(e) => e,
        Err(_) => return "{}".to_string(),
    };

    let mut totals: HashMap<String, f64> = HashMap::new();
    let mut total_spent = 0.0;

    for exp in &expenses {
        total_spent += exp.amount;
        *totals.entry(exp.category.clone()).or_insert(0.0) += exp.amount;
    }

    let mut category_list: Vec<CategoryTotal> = Vec::new();
    let mut highest_category = String::new();
    let mut max_amount = -1.0;

    for (cat, amt) in totals {
        let pct = if total_spent > 0.0 {
            (amt / total_spent) * 100.0
        } else {
            0.0
        };
        if amt > max_amount {
            max_amount = amt;
            highest_category = cat.clone();
        }
        category_list.push(CategoryTotal {
            category: cat,
            amount: (amt * 100.0).round() / 100.0,
            percentage: (pct * 10.0).round() / 10.0,
        });
    }

    // Sort descending by amount
    category_list.sort_by(|a, b| b.amount.partial_cmp(&a.amount).unwrap_or(std::cmp::Ordering::Equal));

    let output = ExpenseBreakdownOutput {
        total_spent: (total_spent * 100.0).round() / 100.0,
        category_totals: category_list,
        highest_category,
        expense_count: expenses.len(),
    };

    serde_json::to_string(&output).unwrap_or_else(|_| "{}".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_haversine_distance() {
        let d = wasm_haversine_distance_km(35.6895, 139.6917, 35.6895, 139.6917);
        assert_eq!(d, 0.0);

        let d_kyoto = wasm_haversine_distance_km(35.6895, 139.6917, 35.0116, 135.7681);
        assert!(d_kyoto > 360.0 && d_kyoto < 390.0);
    }

    #[test]
    fn test_tsp_optimization_preserves_anchor() {
        let stops = vec![
            StopInput { id: "s0".into(), latitude: 35.6800, longitude: 139.7000 },
            StopInput { id: "s1".into(), latitude: 35.8000, longitude: 139.8000 },
            StopInput { id: "s2".into(), latitude: 35.6900, longitude: 139.7100 },
            StopInput { id: "s3".into(), latitude: 35.8500, longitude: 139.8500 },
        ];
        let json = serde_json::to_string(&stops).unwrap();
        let res_str = wasm_optimize_route_tsp(&json, "drive");
        let res: OptimizationOutput = serde_json::from_str(&res_str).unwrap();

        assert_eq!(res.optimized_ids.len(), 4);
        assert_eq!(res.optimized_ids[0], "s0"); // Preserves start anchor
        assert!(res.optimized_duration_mins <= res.original_duration_mins);
    }

    #[test]
    fn test_expense_breakdown() {
        let expenses = vec![
            ExpenseItemInput { amount: 100.0, category: "Food".into() },
            ExpenseItemInput { amount: 200.0, category: "Hotel".into() },
            ExpenseItemInput { amount: 50.0, category: "Food".into() },
        ];
        let json = serde_json::to_string(&expenses).unwrap();
        let res_str = wasm_compute_expense_breakdown(&json);
        assert!(res_str.contains("\"total_spent\":350.0"));
        assert!(res_str.contains("\"highest_category\":\"Hotel\""));
    }
}

