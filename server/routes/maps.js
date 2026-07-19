const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

let mapplsToken = null;
let tokenExpiry = null;

// GET /api/maps/token — fetches Mappls OAuth token server-side (no user auth needed, credentials stay on server)
router.get('/token', async (req, res) => {
  try {
    // Return cached token if valid (give a 10 min buffer)
    if (mapplsToken && tokenExpiry && Date.now() < tokenExpiry - 600000) {
      return res.json({ access_token: mapplsToken });
    }

    const { MAPPLS_CLIENT_ID, MAPPLS_CLIENT_SECRET } = process.env;
    if (!MAPPLS_CLIENT_ID || !MAPPLS_CLIENT_SECRET) {
      return res.status(500).json({ message: 'Mappls credentials not configured' });
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', MAPPLS_CLIENT_ID);
    params.append('client_secret', MAPPLS_CLIENT_SECRET);

    const response = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to fetch Mappls token');
    }

    mapplsToken = data.access_token;
    // expires_in is in seconds
    tokenExpiry = Date.now() + (data.expires_in * 1000);

    res.json({ access_token: mapplsToken });
  } catch (error) {
    console.error('[Maps Route] Error fetching Mappls token:', error.message);
    res.status(500).json({ message: 'Failed to authenticate with map provider' });
  }
});

module.exports = router;
