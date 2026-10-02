import { Hono } from 'hono';
import { createClient, type Client } from '@libsql/client/web';
import { parseOpeningHours } from '@roammate/core';
import { ensureTables, type Bindings } from '../index';

export const placesRouter = new Hono<{ Bindings: Bindings }>();

placesRouter.get('/search', async (c) => {
  const q = c.req.query('q');
  if (!q) return c.json([]);

  const now = Date.now();
  const foursquareApiKey = c.env.FOURSQUARE_API_KEY;
  const yelpApiKey = c.env.YELP_API_KEY;

  try {
    let turso: Client | null = null;
    if (c.env.TURSO_DATABASE_URL && c.env.TURSO_AUTH_TOKEN) {
      turso = createClient({
        url: c.env.TURSO_DATABASE_URL,
        authToken: c.env.TURSO_AUTH_TOKEN,
      });
      await ensureTables(turso);
    }

    let results = [];

    // --- 1. Foursquare Places API (Primary for Places) ---
    if (foursquareApiKey) {
      const fsqUrl = `https://api.foursquare.com/v3/places/search?query=\${encodeURIComponent(q)}&limit=5&fields=fsq_id,name,location,rating,geocodes,categories,website,tel`;
      let fsqRes;
      try {
        fsqRes = await fetch(fsqUrl, {
          headers: {
            'Accept': 'application/json',
            'Authorization': foursquareApiKey
          }
        });
      } catch (err) {
        console.warn('Foursquare API network error, falling back:', err);
      }
      
      if (fsqRes && fsqRes.ok) {
        const fsqData: any = await fsqRes.json();
        if (fsqData.results && fsqData.results.length > 0) {
          results = fsqData.results.map((place: any) => {
            return {
              placeId: `fsq_\${place.fsq_id}`,
              title: place.name || q,
              address: place.location?.formatted_address,
              coordinates: { 
                latitude: place.geocodes?.main?.latitude, 
                longitude: place.geocodes?.main?.longitude 
              },
              osmClass: 'foursquare',
              osmType: place.categories?.[0]?.name,
              openTime: undefined,
              closeTime: undefined,
              website: place.website,
              phoneNumber: place.tel,
              rating: place.rating ? place.rating / 2 : undefined
            };
          });
        }
      }
    }
    
    // --- 2. Yelp Fusion API (Backup for Attractions & Restaurants) ---
    if (results.length === 0 && yelpApiKey) {
      const term = q.split(',')[0].trim();
      const yelpUrl = `https://api.yelp.com/v3/businesses/search?location=\${encodeURIComponent(q)}&term=\${encodeURIComponent(term)}&limit=5&sort_by=best_match`;
      let yelpRes;
      try {
        yelpRes = await fetch(yelpUrl, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer \${yelpApiKey}`
          }
        });
      } catch (err) {
        console.warn('Yelp API network error, falling back:', err);
      }
      
      if (yelpRes && yelpRes.ok) {
        const yelpData: any = await yelpRes.json();
        if (yelpData.businesses && yelpData.businesses.length > 0) {
          results = yelpData.businesses.map((biz: any) => {
            return {
              placeId: `yelp_\${biz.id}`,
              title: biz.name || q,
              address: biz.location?.display_address?.join(', '),
              coordinates: { latitude: biz.coordinates?.latitude, longitude: biz.coordinates?.longitude },
              osmClass: 'yelp',
              osmType: biz.categories?.[0]?.alias,
              openTime: undefined,
              closeTime: undefined,
              website: biz.url,
              phoneNumber: biz.display_phone || biz.phone,
              rating: biz.rating // Yelp rating is already out of 5
            };
          });
        }
      }
    }
    
    // --- 3. Nominatim Fallback (If no keys or no results) ---
    if (results.length === 0) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(q)}&addressdetails=1&extratags=1&limit=5`;
      let res;
      try {
        res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'roammate/1.0' } });
      } catch (err) {
        console.warn('Nominatim API network error:', err);
      }

      if (res && res.ok) {
        const data: any[] = await res.json();
        results = await Promise.all(data.map(async (item: any) => {
          const extratags = item.extratags || {};
          const openTimeRaw = extratags.opening_hours;
          
          let openTime, closeTime;
          if (openTimeRaw && typeof openTimeRaw === 'string') {
            const parsedHours = parseOpeningHours(openTimeRaw);
            openTime = parsedHours.openTime;
            closeTime = parsedHours.closeTime;
          }

          return {
            placeId: `osm_\${item.osm_type}_\${item.osm_id}`,
            title: item.name || item.display_name?.split(',')[0] || q,
            address: item.display_name,
            coordinates: { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) },
            osmClass: item.class,
            osmType: item.type,
            openTime,
            closeTime,
            website: extratags.website || extratags['contact:website'],
            phoneNumber: extratags.phone || extratags['contact:phone'],
            rating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)),
          };
        }));
      }
    }

    // Cache in Turso
    if (turso && results.length > 0) {
      for (const placeData of results) {
        try {
          await turso.execute({
            sql: `INSERT INTO places (id, name, lat, lon, address, type, rating, open_time, close_time, website, phone, data, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET 
                    name = excluded.name, address = excluded.address, rating = excluded.rating,
                    open_time = excluded.open_time, close_time = excluded.close_time, updated_at = excluded.updated_at`,
            args: [
              placeData.placeId, placeData.title, placeData.coordinates.latitude || 0, placeData.coordinates.longitude || 0,
              placeData.address || '', placeData.osmClass || '', placeData.rating || 0,
              placeData.openTime || null, placeData.closeTime || null, placeData.website || null, placeData.phoneNumber || null,
              JSON.stringify(placeData), now
            ],
          });
        } catch (dbErr) {
          console.warn('Failed to cache place', dbErr);
        }
      }
    }

    return c.json(results);
  } catch (err) {
    console.error('Places search error:', err);
    return c.json([]);
  }
});
