#!/usr/bin/env node

/**
 * AI Agent CLI for Roammate Trip Generation
 * 
 * Usage:
 *   node scripts/agent-create-trip.js <path-to-trip.json> [--api-url <url>] [--password <pass>]
 * 
 * This CLI allows AI agents to easily inject complete itineraries into the Roammate backend.
 */

import fs from 'fs';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Roammate AI Trip Generator CLI
==============================
Usage:
  node scripts/agent-create-trip.js <path-to-trip.json> [options]

Options:
  --api-url <url>      The API URL (default: http://localhost:8787)
  --password <pass>    The API sync password (required for POST to /api/itinerary)
    `);
    process.exit(0);
  }

  const filePath = args[0];
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  let tripData;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    tripData = JSON.parse(fileContent);
  } catch (err) {
    console.error(`Error: Failed to parse JSON file - ${err.message}`);
    process.exit(1);
  }

  if (!tripData.id) {
    tripData.id = \`trip-\${Date.now()}\`;
  }
  
  let apiUrl = 'http://localhost:8787';
  let password = '';

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--api-url' && args[i + 1]) {
      apiUrl = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    }
  }

  console.log(\`Sending trip "\${tripData.title || tripData.id}" to \${apiUrl}...\`);

  try {
    const res = await fetch(\`\${apiUrl}/api/itinerary\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Password': password
      },
      body: JSON.stringify({
        id: tripData.id,
        title: tripData.title || 'AI Generated Trip',
        data: tripData
      })
    });

    if (res.ok) {
      console.log('✅ Trip successfully saved to database!');
      const responseData = await res.json();
      console.log(responseData);
    } else {
      const errorText = await res.text();
      console.error(\`❌ API Error (\${res.status}):\`, errorText);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Network Error:', err.message);
    process.exit(1);
  }
}

main();
