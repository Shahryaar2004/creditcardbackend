// Spatial distance mathematical tracking (Haversine Formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const runFraudAnalysis = (currentTxn, lastTxn = null) => {
  let riskScore = 0;
  const flags = [];

  // Rule 1: High Transaction Amount Check (Section 6.0)
  if (currentTxn.amount > 50000) {
    riskScore += 35;
    flags.push("High Amount Volatility Tier 1 (>50k)");
  } else if (currentTxn.amount > 10000) {
    riskScore += 15;
    flags.push("Moderate Amount Threshold (>10k)");
  }

  // Rule 2: Night Operational Window Anomaly
  const txHour = new Date(currentTxn.timestamp || Date.now()).getHours();
  if (txHour >= 1 && txHour <= 4) {
    riskScore += 20;
    flags.push("Suspicious Non-Business Hour Activity");
  }

  // Rule 3: Instant Location Shift & Velocity Evaluation
  if (lastTxn && lastTxn.location && currentTxn.location) {
    const distanceKm = calculateDistance(
      lastTxn.location.lat,
      lastTxn.location.lng,
      currentTxn.location.lat,
      currentTxn.location.lng
    );

    const timeDiffHours = (new Date(currentTxn.timestamp || Date.now()) - new Date(lastTxn.timestamp)) / (1000 * 60 * 60);

    // If transactions occur in two places simultaneously, or implied speed exceeds 900 km/h (speed of a jet airliner)
    if (distanceKm > 10) { // Only track meaningful spatial changes
      if (timeDiffHours <= 0.08) { // Less than 5 minutes difference
        riskScore += 55;
        flags.push(`Impossible Spatial Velocity: Moved ${distanceKm.toFixed(0)}km Instantly`);
      } else if (timeDiffHours > 0 && (distanceKm / timeDiffHours) > 900) {
        riskScore += 40;
        flags.push(`Speed Threshold Anomaly: Implied Velocity ${Math.round(distanceKm / timeDiffHours)} km/h`);
      }
    }
  }

  // Rule 4: Structural Integrity Check (Dummy Card Data Warnings)
  if (currentTxn.cardNumber === '4242424242424242') {
    riskScore += 10;
    flags.push("Default Sandbox Test Signature Detected");
  }

  // Cap final risk values safely
  riskScore = Math.min(riskScore, 100);

  // Decision Grading Metrics Allocation
  let status = "Legitimate";
  if (riskScore >= 70) status = "Fraudulent";
  else if (riskScore >= 40) status = "Suspicious";

  return { riskScore, status, flags };
};