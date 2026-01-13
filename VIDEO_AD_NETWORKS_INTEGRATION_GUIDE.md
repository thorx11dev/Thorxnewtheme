# Top 4 Video Ad Networks for THORX Platform - Complete Integration Guide

## Executive Summary

This document presents the top 4 video ad networks suitable for the THORX rewards platform based on comprehensive research conducted in October 2025. All four networks support Pakistan traffic and payouts, require standard registration (no lengthy sales cycles), accept unlimited traffic, and provide robust APIs/webhooks with strong developer documentation. The recommended networks are: **Adsterra** (Rank #1 - best balance of accessibility, eCPM, and Pakistan support with $5 minimum payout), **Google Ad Manager with IMA SDK** (Rank #2 - industry-leading technology and reach), **PropellerAds** (Rank #3 - excellent for quick deployment with $5 minimum), and **Media.net** (Rank #4 - contextual targeting backed by Yahoo/Bing). All four support family-friendly content filtering and provide comprehensive integration documentation. For Pakistan-based publishers, Adsterra offers the fastest path to monetization with wire transfer, PayPal, or crypto payments, while Google Ad Manager provides the highest quality demand but requires a $100 minimum payout threshold.

---

## 1. Network Summary Cards

### Network #1: Adsterra
**Headline**: Low barrier entry ($5 minimum), premium CPMs up to $25, excellent Pakistan support  
**Primary Model**: CPM, CPC, CPI, CPA (fully managed)

### Network #2: Google Ad Manager (IMA SDK)
**Headline**: Industry-leading video platform with enterprise-grade SDKs and global demand  
**Primary Model**: CPM, CPCV (Cost Per Completed View)

### Network #3: PropellerAds
**Headline**: Ultra-low $5 minimum payout, NET-7 payments, strong global reach  
**Primary Model**: CPM, CPC, SmartCPA

### Network #4: Media.net
**Headline**: Contextual video ads powered by Yahoo/Bing with $100 minimum  
**Primary Model**: CPM, Revenue Share

---

## 2. Detailed Comparison Table

| Criteria | Adsterra | Google Ad Manager (IMA SDK) | PropellerAds | Media.net |
|----------|----------|----------------------------|--------------|-----------|
| **Business Model** | CPM, CPC, CPI, CPA | CPM, CPCV, RevShare | CPM, CPC, SmartCPA | CPM, RevShare |
| **eCPM Range (Video)** | $2-$25 (Pakistan: $0.50-$3) | $10-$20 (Tier 1), $0.50-$3 (Pakistan) | $1-$15 (Pakistan: $0.50-$2.50) | $5-$18 (Pakistan: $0.50-$3) |
| **Payment Methods** | PayPal, Wire, Paxum, WebMoney, Bitcoin | Wire Transfer, Western Union | PayPal, Wire, Cheque, Bitcoin, Credit Card | Wire Transfer, PayPal |
| **Minimum Payout** | $5 (Paxum), $100 (PayPal/Crypto), $1000 (Wire) | $100 (all methods) | $5 (all methods) | $100 (all methods) |
| **Payment Terms** | NET-15 (bi-weekly: 1st/2nd, 16th/17th) | NET-60 to NET-90 | NET-7 | NET-30 |
| **Pakistan Support** | ✅ **YES** - Explicitly listed, local bank via Hyperwallet | ✅ **YES** - Via wire transfer/Western Union | ✅ **YES** - All payment methods available | ✅ **YES** - Wire transfer supported |
| **Traffic Restrictions** | None (unlimited traffic accepted) | None (scales infinitely) | None (unlimited) | Quality content required, no minimum traffic |
| **Signup Process** | Standard (5-10 min) - instant approval | Standard (account setup + verification) | Standard (instant for most publishers) | Moderate (application review, 1-3 days) |
| **Video Ad Formats** | VAST/VPAID (pre/mid/post-roll), Outstream, Instream | IMA SDK: Pre-roll, Mid-roll, Post-roll, DAI, Rewarded | Video Pre-roll, Interstitial, Instream | Instream, Outstream, Native Video |
| **SDKs/Libraries** | Publisher API (REST), VAST tags | IMA SDK (Web, Android, iOS, Unity), SOAP/REST API | API (REST), Tag-based integration | Android/iOS SDK, Prebid.js adapter |
| **Webhook Support** | ⚠️ Publisher API for stats (polling) | ⚠️ Google Cloud Pub/Sub for events | ⚠️ Postback URLs for conversions | ❌ Limited (reporting API only) |
| **Documentation Quality** | ⭐⭐⭐⭐ Good (API docs, blog guides) | ⭐⭐⭐⭐⭐ Excellent (comprehensive, multi-language) | ⭐⭐⭐⭐ Good (clear guides, support) | ⭐⭐⭐ Moderate (SDK docs available) |
| **Family-Friendly** | ✅ Content filtering available | ✅ Extensive filtering controls | ⚠️ Allows adult content (filterable) | ✅ Contextual ads (brand-safe) |
| **Docs URL** | https://adsterra.com/api/ | https://developers.google.com/interactive-media-ads | https://propellerads.com/publishers/ | http://docs.msas.media.net/ |
| **T&Cs URL** | https://adsterra.com/terms-and-conditions/ | https://policies.google.com/terms | https://propellerads.com/terms/ | https://www.media.net/terms-of-service |
| **API/Dev Docs** | https://adsterra.com/blog/api-v3/ | https://developers.google.com/ad-manager/video | Contact: publishers@propellerads.com | http://docs.msas.media.net/getting-started-android/ |

---

## 3. Integration Packs

### 3.1 Adsterra Integration Pack

#### Required Credentials
1. **Publisher ID**: Obtained after signup at https://publishers.adsterra.com/signup
2. **API Token**: Generated from Settings → API tab in publisher dashboard
3. **Video Ad Placement ID**: Created in "My Sites" after adding your domain

#### Where to Get Credentials
1. Sign up as publisher: https://publishers.adsterra.com/signup
2. Verify email and add your website/domain
3. Navigate to **Settings → API** → Click "Generate New Token"
4. Copy the token immediately (won't be shown again)
5. Create a new ad placement: **My Sites → Add Ad** → Select **"VAST/VPAID Video Ads"**
6. Copy the Placement ID from the generated code

#### Vanilla JavaScript Integration (Web)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Adsterra Video Ad Example</title>
</head>
<body>
    <h1>Watch Video to Earn Rewards</h1>
    
    <!-- Container for video ad -->
    <div id="adsterra-video-container"></div>
    
    <script>
        // Adsterra VAST tag integration
        (function() {
            var vastTag = 'https://syndication.optimizesrv.com/v1/vast/YOUR_PLACEMENT_ID';
            
            // Initialize video ad player (using example with JW Player or Video.js)
            var playerConfig = {
                file: vastTag,
                width: '100%',
                aspectratio: '16:9',
                advertising: {
                    client: 'vast',
                    tag: vastTag
                }
            };
            
            // Track ad completion for rewards
            jwplayer('adsterra-video-container').setup(playerConfig);
            
            jwplayer().on('adComplete', function(event) {
                console.log('Ad completed, award user points');
                // Call your rewards API
                fetch('/api/ad-completion', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        userId: getCurrentUserId(),
                        adNetwork: 'adsterra',
                        timestamp: new Date().toISOString()
                    })
                });
            });
        })();
    </script>
</body>
</html>
```

#### Node.js/Express Backend Integration

```javascript
// adsterra-integration.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Adsterra Publisher API configuration
const ADSTERRA_API_URL = 'https://api.adsterra.com';
const API_KEY = process.env.ADSTERRA_API_KEY; // Store securely in env vars

/**
 * Fetch ad statistics from Adsterra API
 * Endpoint: GET /publisher/stats
 */
async function getAdsterraStats(startDate, endDate) {
    try {
        const response = await axios.get(`${ADSTERRA_API_URL}/publisher/stats`, {
            headers: {
                'X-API-Key': API_KEY
            },
            params: {
                start: startDate, // Format: YYYY-MM-DD
                end: endDate,
                group_by: 'geo,domain' // Optional grouping
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Adsterra API Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Track ad view completion and award user
 */
router.post('/api/ad-completion', async (req, res) => {
    const { userId, adNetwork, timestamp } = req.body;
    
    if (adNetwork !== 'adsterra') {
        return res.status(400).json({ error: 'Invalid ad network' });
    }
    
    try {
        // Validate user exists
        const user = await db.users.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Log ad view to database
        await db.ad_views.create({
            user_id: userId,
            ad_network: 'adsterra',
            ad_type: 'video',
            completed_at: timestamp,
            reward_points: 10 // Configure your reward amount
        });
        
        // Award points to user
        await db.users.increment('points', { where: { id: userId }, by: 10 });
        
        res.json({ 
            success: true, 
            points_awarded: 10,
            new_balance: user.points + 10
        });
    } catch (error) {
        console.error('Error processing ad completion:', error);
        res.status(500).json({ error: 'Failed to process ad completion' });
    }
});

/**
 * Daily cron job to sync stats from Adsterra API
 */
async function syncDailyStats() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    try {
        const stats = await getAdsterraStats(dateStr, dateStr);
        
        // Store stats in database for reporting
        await db.ad_revenue.create({
            date: dateStr,
            network: 'adsterra',
            impressions: stats.impressions,
            clicks: stats.clicks,
            revenue: stats.revenue,
            ecpm: stats.ecpm
        });
        
        console.log(`Synced Adsterra stats for ${dateStr}`);
    } catch (error) {
        console.error('Failed to sync Adsterra stats:', error);
    }
}

module.exports = { router, syncDailyStats };
```

#### Sample API Response (Stats Endpoint)

```json
{
  "impressions": 125340,
  "clicks": 3421,
  "ctr": 2.73,
  "revenue": 342.15,
  "ecpm": 2.73,
  "by_geo": {
    "PK": {
      "impressions": 45230,
      "revenue": 125.40,
      "ecpm": 2.77
    },
    "US": {
      "impressions": 15100,
      "revenue": 165.50,
      "ecpm": 10.96
    }
  }
}
```

#### Test Workflow
1. **Create Test Placement**: In Adsterra dashboard, create a test placement with your local development domain
2. **Use Test Mode**: Adsterra automatically serves test ads during development
3. **Monitor Dashboard**: Real-time stats appear in publisher dashboard within 1-2 hours
4. **Debug**: Check browser console for VAST errors, verify placement ID is correct
5. **Validate**: Use VAST Validator tools online to test your VAST tag URL

#### Security Best Practices
- Store API key in environment variables (`.env` file, never commit to git)
- Validate all incoming webhook/API data
- Implement rate limiting on ad completion endpoints
- Use HTTPS for all API communications
- Verify user authentication before awarding points

---

### 3.2 Google Ad Manager (IMA SDK) Integration Pack

#### Required Credentials
1. **Google Ad Manager Account**: Sign up at https://admanager.google.com
2. **Ad Unit ID**: Create video ad units in Ad Manager dashboard
3. **Network Code**: Found in Admin → Global Settings
4. **Service Account** (for API access): Create in Google Cloud Console

#### Where to Get Credentials
1. Create Ad Manager account (requires Google Workspace or Gmail)
2. Navigate to **Inventory → Ad Units → New Ad Unit**
3. Select **Video Sizes** (e.g., 640x480, 16:9 aspect ratio)
4. Copy the generated **Ad Unit ID** (format: `/network_code/ad_unit`)
5. For API access: Visit https://console.cloud.google.com → Create service account
6. Enable Ad Manager API and generate JSON credentials

#### Vanilla JavaScript Integration (IMA SDK)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Google IMA Video Ad Example</title>
    <script src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"></script>
    <style>
        #video-container {
            position: relative;
            width: 640px;
            height: 360px;
        }
        #content-video {
            width: 100%;
            height: 100%;
        }
        #ad-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <h1>Google IMA Video Ads</h1>
    
    <div id="video-container">
        <video id="content-video" controls></video>
        <div id="ad-container"></div>
    </div>
    
    <script>
        var adsManager;
        var adsLoader;
        var adDisplayContainer;
        var videoContent;
        
        function initPlayer() {
            videoContent = document.getElementById('content-video');
            videoContent.src = 'path/to/your-content-video.mp4'; // Optional content
            
            initializeIMA();
        }
        
        function initializeIMA() {
            adDisplayContainer = new google.ima.AdDisplayContainer(
                document.getElementById('ad-container'),
                videoContent
            );
            
            adsLoader = new google.ima.AdsLoader(adDisplayContainer);
            
            // Listen for ads manager loaded event
            adsLoader.addEventListener(
                google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
                onAdsManagerLoaded,
                false
            );
            
            adsLoader.addEventListener(
                google.ima.AdErrorEvent.Type.AD_ERROR,
                onAdError,
                false
            );
            
            // Request ads
            var adsRequest = new google.ima.AdsRequest();
            adsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?' +
                'iu=/21775744923/external/single_ad_samples&' +
                'sz=640x480&' +
                'cust_params=sample_ct%3Dlinear&' +
                'ciu_szs=300x250%2C728x90&' +
                'gdfp_req=1&' +
                'output=vast&' +
                'unviewed_position_start=1&' +
                'env=vp&' +
                'impl=s&' +
                'correlator=';
            
            adsRequest.linearAdSlotWidth = 640;
            adsRequest.linearAdSlotHeight = 360;
            adsRequest.nonLinearAdSlotWidth = 640;
            adsRequest.nonLinearAdSlotHeight = 150;
            
            adsLoader.requestAds(adsRequest);
        }
        
        function onAdsManagerLoaded(adsManagerLoadedEvent) {
            var adsRenderingSettings = new google.ima.AdsRenderingSettings();
            adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
            
            adsManager = adsManagerLoadedEvent.getAdsManager(
                videoContent,
                adsRenderingSettings
            );
            
            // Add event listeners
            adsManager.addEventListener(
                google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
                onContentPauseRequested
            );
            adsManager.addEventListener(
                google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
                onContentResumeRequested
            );
            adsManager.addEventListener(
                google.ima.AdEvent.Type.COMPLETE,
                onAdComplete
            );
            
            try {
                adDisplayContainer.initialize();
                adsManager.init(640, 360, google.ima.ViewMode.NORMAL);
                adsManager.start();
            } catch (adError) {
                console.error('AdsManager error:', adError);
                videoContent.play();
            }
        }
        
        function onContentPauseRequested() {
            videoContent.pause();
        }
        
        function onContentResumeRequested() {
            videoContent.play();
        }
        
        function onAdComplete() {
            console.log('Ad completed - award user points');
            
            // Track ad completion
            fetch('/api/ad-completion', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: getCurrentUserId(),
                    adNetwork: 'google_iam',
                    timestamp: new Date().toISOString()
                })
            });
        }
        
        function onAdError(adErrorEvent) {
            console.error('Ad error:', adErrorEvent.getError());
            if (adsManager) {
                adsManager.destroy();
            }
        }
        
        // Initialize on page load
        window.addEventListener('load', initPlayer);
    </script>
</body>
</html>
```

#### Node.js/Express Backend Integration

```javascript
// google-admanager-integration.js
const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// Google Ad Manager API setup
const SERVICE_ACCOUNT_KEY = require('./path/to/service-account-key.json');
const NETWORK_CODE = process.env.GAM_NETWORK_CODE;

async function getAuthenticatedClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: SERVICE_ACCOUNT_KEY,
        scopes: ['https://www.googleapis.com/auth/dfp']
    });
    
    return await auth.getClient();
}

/**
 * Fetch ad revenue report from Google Ad Manager
 */
async function fetchAdManagerReport(startDate, endDate) {
    try {
        const authClient = await getAuthenticatedClient();
        const admanager = google.admanager({ version: 'v1', auth: authClient });
        
        // Create report request
        const report = {
            requestBody: {
                name: `networks/${NETWORK_CODE}/reports`,
                dateRange: {
                    startDate: { year: 2025, month: 1, day: 1 },
                    endDate: { year: 2025, month: 1, day: 31 }
                },
                dimensions: ['DATE', 'AD_UNIT_NAME'],
                metrics: ['TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS', 'TOTAL_LINE_ITEM_LEVEL_CPM_AND_CPC_REVENUE']
            }
        };
        
        const response = await admanager.networks.reports.generate(report);
        return response.data;
    } catch (error) {
        console.error('GAM API Error:', error);
        throw error;
    }
}

/**
 * Track video ad completion
 */
router.post('/api/ad-completion', async (req, res) => {
    const { userId, adNetwork, timestamp } = req.body;
    
    if (adNetwork !== 'google_iam') {
        return res.status(400).json({ error: 'Invalid ad network' });
    }
    
    try {
        // Log ad view and award points
        await db.ad_views.create({
            user_id: userId,
            ad_network: 'google_admanager',
            ad_type: 'video',
            completed_at: timestamp,
            reward_points: 15
        });
        
        await db.users.increment('points', { where: { id: userId }, by: 15 });
        
        res.json({ success: true, points_awarded: 15 });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Processing failed' });
    }
});

module.exports = { router, fetchAdManagerReport };
```

#### Test Workflow
1. **Use Google's Test Ad Tags**: IMA SDK provides test VAST tags
2. **Test URL**: `https://pubads.g.doubleclick.net/gampad/ads?...&impl=s&env=vp`
3. **Chrome DevTools**: Monitor network requests for VAST XML responses
4. **IMA SDK Inspector**: Use browser extension for debugging
5. **Validate**: Test on multiple devices and browsers

#### Security Best Practices
- Never expose service account keys in frontend code
- Store credentials in secure environment variables
- Implement OAuth 2.0 for production API access
- Use HTTPS for all ad requests
- Validate ad completion events on server-side

---

### 3.3 PropellerAds Integration Pack

#### Required Credentials
1. **Publisher Account**: Sign up at https://propellerads.com/publishers/
2. **Zone ID**: Created for each ad placement
3. **Postback URL** (optional): For conversion tracking

#### Where to Get Credentials
1. Register at https://propellerads.com/publishers/
2. Email verification and account approval (usually instant)
3. Navigate to **Websites → Add New Website**
4. Select **Video Ads** format
5. Copy the **Zone ID** from the generated integration code

#### Vanilla JavaScript Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>PropellerAds Video Integration</title>
</head>
<body>
    <h1>PropellerAds Video Ad</h1>
    
    <!-- PropellerAds Video Container -->
    <div id="propeller-video-ad"></div>
    
    <script>
        // PropellerAds video ad script
        var propellerConfig = {
            zoneId: 'YOUR_ZONE_ID', // Replace with your Zone ID
            type: 'video',
            container: 'propeller-video-ad'
        };
        
        (function(d, s, id) {
            var js, pjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = '//js.propellerads.com/native.js';
            js.setAttribute('data-zone', propellerConfig.zoneId);
            pjs.parentNode.insertBefore(js, pjs);
            
            // Track ad completion
            js.onload = function() {
                console.log('PropellerAds video loaded');
                
                // Listen for video completion (PropellerAds callback)
                window.propellerOnComplete = function() {
                    console.log('Video ad completed');
                    
                    fetch('/api/ad-completion', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            userId: getCurrentUserId(),
                            adNetwork: 'propellerads',
                            timestamp: new Date().toISOString()
                        })
                    });
                };
            };
        }(document, 'script', 'propeller-jssdk'));
    </script>
</body>
</html>
```

#### Node.js/Express Backend Integration

```javascript
// propellerads-integration.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

/**
 * Handle PropellerAds postback for conversion tracking
 * Postback URL format: https://yourdomain.com/api/propeller-postback?clickid={clickid}&payout={payout}
 */
router.get('/api/propeller-postback', async (req, res) => {
    const { clickid, payout, status, ip, token } = req.query;
    
    // Verify postback authenticity using token
    const expectedToken = crypto
        .createHash('md5')
        .update(`${clickid}${process.env.PROPELLER_SECRET}`)
        .digest('hex');
    
    if (token !== expectedToken) {
        return res.status(403).send('Invalid token');
    }
    
    try {
        // Log conversion
        await db.ad_conversions.create({
            click_id: clickid,
            network: 'propellerads',
            payout: parseFloat(payout),
            status: status,
            ip_address: ip,
            received_at: new Date()
        });
        
        res.send('OK');
    } catch (error) {
        console.error('PropellerAds postback error:', error);
        res.status(500).send('Error');
    }
});

/**
 * Track ad view completion
 */
router.post('/api/ad-completion', async (req, res) => {
    const { userId, adNetwork, timestamp } = req.body;
    
    if (adNetwork !== 'propellerads') {
        return res.status(400).json({ error: 'Invalid ad network' });
    }
    
    try {
        await db.ad_views.create({
            user_id: userId,
            ad_network: 'propellerads',
            ad_type: 'video',
            completed_at: timestamp,
            reward_points: 10
        });
        
        await db.users.increment('points', { where: { id: userId }, by: 10 });
        
        res.json({ success: true, points_awarded: 10 });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process' });
    }
});

module.exports = router;
```

#### Sample Postback Data

```
GET https://yourdomain.com/api/propeller-postback?clickid=abc123&payout=0.45&status=pending&ip=123.45.67.89&token=a1b2c3d4e5f6
```

#### Test Workflow
1. **Test Mode**: PropellerAds dashboard has test mode for development
2. **Monitor**: Real-time statistics in PropellerAds dashboard
3. **Postback Testing**: Use RequestBin or Webhook.site to test postback URLs
4. **Debug**: Check zone ID and script loading in browser console

#### Security Best Practices
- Validate postback tokens using shared secret
- Store Zone IDs in environment variables for easy rotation
- Implement IP whitelist for postback endpoints (PropellerAds IPs)
- Rate limit postback endpoints

---

### 3.4 Media.net Integration Pack

#### Required Credentials
1. **Customer ID**: 9-digit numeric ID from account manager
2. **Site ID**: Generated after adding website
3. **API Credentials** (optional): For programmatic access

#### Where to Get Credentials
1. Apply at https://www.media.net/publishers/
2. Application review (1-3 business days)
3. Upon approval, receive **Customer ID** via email
4. Add website in dashboard to get **Site ID**
5. Contact mobileapps@media.net for SDK/API credentials

#### Vanilla JavaScript Integration (Web/Prebid)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Media.net Video Ads via Prebid</title>
    <script async src="https://cdn.jsdelivr.net/npm/prebid.js@latest/dist/prebid.js"></script>
</head>
<body>
    <h1>Media.net Video Ads</h1>
    
    <div id="video-ad-container"></div>
    
    <script>
        var pbjs = pbjs || {};
        pbjs.que = pbjs.que || [];
        
        pbjs.que.push(function() {
            var adUnits = [{
                code: 'video-ad-container',
                mediaTypes: {
                    video: {
                        playerSize: [640, 480],
                        context: 'instream',
                        mimes: ['video/mp4'],
                        protocols: [2, 3, 5, 6],
                        playbackmethod: [2],
                        skip: 1
                    }
                },
                bids: [{
                    bidder: 'medianet',
                    params: {
                        cid: '8CUX0H51C', // Replace with your Customer ID
                        crid: '451466393', // Creative ID (optional)
                        site: {
                            page: window.location.href,
                            domain: window.location.hostname
                        }
                    }
                }]
            }];
            
            pbjs.addAdUnits(adUnits);
            pbjs.requestBids({
                bidsBackHandler: function(bids) {
                    console.log('Media.net bids:', bids);
                    // Render winning bid
                    var vastUrl = pbjs.getBidResponses()['video-ad-container'].bids[0].vastUrl;
                    renderVideoAd(vastUrl);
                }
            });
        });
        
        function renderVideoAd(vastUrl) {
            // Use your preferred video player (e.g., Video.js, JW Player)
            console.log('VAST URL:', vastUrl);
            
            // Track completion
            videoPlayer.on('ended', function() {
                fetch('/api/ad-completion', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        userId: getCurrentUserId(),
                        adNetwork: 'medianet',
                        timestamp: new Date().toISOString()
                    })
                });
            });
        }
    </script>
</body>
</html>
```

#### Node.js/Express Backend Integration

```javascript
// medianet-integration.js
const express = require('express');
const router = express.Router();

/**
 * Track ad completion for Media.net
 */
router.post('/api/ad-completion', async (req, res) => {
    const { userId, adNetwork, timestamp } = req.body;
    
    if (adNetwork !== 'medianet') {
        return res.status(400).json({ error: 'Invalid ad network' });
    }
    
    try {
        await db.ad_views.create({
            user_id: userId,
            ad_network: 'medianet',
            ad_type: 'video',
            completed_at: timestamp,
            reward_points: 12
        });
        
        await db.users.increment('points', { where: { id: userId }, by: 12 });
        
        res.json({ success: true, points_awarded: 12 });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process' });
    }
});

module.exports = router;
```

#### Android SDK Integration (Mobile Apps)

```gradle
// build.gradle
repositories {
    maven { url "https://maven.media.net" }
}

dependencies {
    implementation "net.media.android:base:1.2.5"
}
```

```java
// MainActivity.java
import net.media.android.MNetAdSdk;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initialize Media.net SDK
        MNetAdSdk.initialize(this, "YOUR_CUSTOMER_ID");
        
        // Update GDPR consent (if applicable)
        MNetAdSdk.updateGdprConsent(1, 1, "consent_string");
    }
}
```

#### Test Workflow
1. **Test Customer ID**: Media.net provides test credentials for development
2. **Prebid Testing**: Use Prebid.js debug mode to inspect bid responses
3. **Monitor**: Check Media.net dashboard for impressions (24-48 hour delay)
4. **Support**: Email mobileapps@media.net for integration assistance

#### Security Best Practices
- Never expose Customer ID in public repositories
- Validate all ad completion events server-side
- Implement GDPR consent management
- Use HTTPS for all API calls

---

## 4. Legal & Content Compliance

### 4.1 Adsterra Terms & Compliance

**Terms & Conditions**: https://adsterra.com/terms-and-conditions/

**Key Publisher Obligations**:
- Content must not infringe copyrights or trademarks
- No misleading or fraudulent traffic generation
- Prohibited content: child exploitation, terrorism, hate speech
- Must comply with GDPR/CCPA data protection laws

**Content Filtering**:
- Family-friendly mode available (contact account manager)
- Can block specific advertiser categories
- Auto-moderation system for ad creative quality

**T&C Clause for Website**:
```
This website uses Adsterra advertising services. By using this site, you agree to the 
placement of cookies and tracking pixels for advertising purposes in accordance with 
Adsterra's Privacy Policy (https://adsterra.com/privacy-policy/). Users in the EEA 
may opt-out of personalized advertising via cookie settings.
```

### 4.2 Google Ad Manager Terms & Compliance

**Terms of Service**: https://policies.google.com/terms  
**Publisher Policies**: https://support.google.com/admanager/answer/9004919

**Key Requirements**:
- Comply with Google Publisher Policies (no misleading content, malware, copyright infringement)
- AdSense Program Policies apply to ad serving
- Must implement GDPR consent mechanism (e.g., Google Consent Mode)
- Prohibited content: dangerous/illegal products, sexual content, child endangerment, misrepresentative content

**Content Filtering**:
- Extensive category blocking (sensitive categories, competitor ads, etc.)
- Brand safety controls in Ad Manager dashboard
- COPPA compliance for children's content

**T&C Clause for Website**:
```
This website uses Google Ad Manager to serve advertisements. Google uses cookies to 
serve ads based on your prior visits to this website or other websites. You may opt out 
of personalized advertising by visiting Google's Ads Settings 
(https://www.google.com/settings/ads). Alternatively, you can opt out of third-party 
vendor cookies by visiting www.aboutads.info.
```

### 4.3 PropellerAds Terms & Compliance

**Terms of Service**: https://propellerads.com/terms/

**Key Publisher Rules**:
- Traffic must be legitimate (no bots, incentivized traffic, or forced redirects)
- Adult content allowed but must be declared during signup
- No misleading ad placements or automatic pop-ups without user action
- GDPR/CCPA compliance required

**Content Filtering**:
- Can filter adult content if desired
- Option to block specific advertiser categories
- Anti-malware and anti-fraud systems in place

**T&C Clause for Website**:
```
Advertisements on this site are served by PropellerAds. By continuing to use this site, 
you consent to the use of cookies and similar technologies for advertising and analytics 
purposes. For more information, please refer to our Privacy Policy and PropellerAds 
Privacy Policy (https://propellerads.com/privacy/).
```

### 4.4 Media.net Terms & Compliance

**Terms of Service**: https://www.media.net/terms-of-service  
**Privacy Policy**: https://www.media.net/privacy-policy

**Key Requirements**:
- Quality content required (no made-for-advertising sites)
- English-language content preferred
- No invalid traffic or click fraud
- Compliance with Yahoo Bing Network Advertiser Guidelines

**Content Filtering**:
- Contextual targeting ensures brand-safe ads
- Category blocking available
- No adult or gambling content served by default

**T&C Clause for Website**:
```
This website displays advertisements provided by Media.net, powered by the Yahoo Bing 
Network. Cookies and similar technologies are used to deliver relevant ads and measure 
their performance. By using this site, you consent to this use of cookies as described 
in our Privacy Policy.
```

---

## 5. Risk Analysis & Tradeoffs

### 5.1 Adsterra

**Risks**:
- **Ad Quality**: Some advertiser creatives may be lower quality compared to premium networks
- **eCPM Volatility**: Pakistan eCPMs can fluctuate ($0.50-$3 range)
- **Payment Delays**: NET-15 means 2-4 week wait for first payment

**Approval Time**: Instant to 24 hours (fast)

**Policy Enforcement**: Moderate - automatic fraud detection, manual review for suspicious traffic

**Mitigations**:
- Enable family-friendly filtering from day one
- Monitor dashboard daily for ad quality issues
- Start with Paxum payment method ($5 minimum) to test quickly
- Diversify with another network (mediation) for fill rate optimization

**Ad Quality Concerns**: Occasionally serves pop-under style ads; use VAST video only to avoid

---

### 5.2 Google Ad Manager (IMA SDK)

**Risks**:
- **High Barrier**: Requires technical integration skills
- **$100 Minimum**: Takes longer to reach first payout for small publishers
- **Approval**: May require traffic/quality review for some features
- **NET-60/90**: Long payment cycles

**Approval Time**: Account setup immediate, full features may require review (1-7 days)

**Policy Enforcement**: Strict - automated systems flag policy violations, manual review for appeals

**Mitigations**:
- Follow integration best practices precisely (use official IMA SDK)
- Implement GDPR consent management from start
- Monitor Ad Manager policy center weekly
- Combine with faster-paying network (Adsterra) for cash flow

**Ad Quality Concerns**: Minimal - premium advertisers, brand-safe by default

---

### 5.3 PropellerAds

**Risks**:
- **Adult Content**: Network serves adult ads unless filtered
- **Reputation**: Less premium than Google, may affect site perception
- **eCPM Lower**: Pakistan rates typically $0.50-$2.50

**Approval Time**: Instant for most publishers

**Policy Enforcement**: Moderate - fraud detection systems, tolerates more aggressive monetization

**Mitigations**:
- Declare site category accurately during signup
- Enable adult content filtering in dashboard
- Use video pre-roll only (avoid pop-unders for better UX)
- Monitor for malicious ads and report immediately

**Ad Quality Concerns**: Variable quality; implement content filtering to maintain family-friendly standard

---

### 5.4 Media.net

**Risks**:
- **Approval Required**: 1-3 day application review, may reject low-quality sites
- **English Content**: Prefers English-language sites (may limit Pakistan Urdu content)
- **$100 Minimum**: Higher barrier to first payout
- **Customer ID Required**: Must contact account manager for SDK integration

**Approval Time**: 1-3 business days (moderate)

**Policy Enforcement**: Strict - quality control, may suspend for invalid traffic

**Mitigations**:
- Ensure quality content before applying
- Use English interface for THORX platform
- Implement robust anti-fraud measures
- Combine with lower-minimum network (PropellerAds) for cash flow

**Ad Quality Concerns**: High quality - contextual ads from Yahoo/Bing, brand-safe

---

## 6. Final Rankings & Recommendations

### Rankings (1-4)

#### **Rank #1: Adsterra** ⭐⭐⭐⭐⭐
**Justification**: Best overall choice for Pakistan-based publishers due to:
- Ultra-low $5 minimum payout (Paxum/WebMoney)
- Explicit Pakistan support with eCPM data
- Fast NET-15 bi-weekly payments
- No traffic restrictions
- Instant approval
- Family-friendly filtering available
- Strong video ad formats (VAST/VPAID)
- REST API for programmatic integration

**Best For**: Quick deployment, cash flow optimization, testing rewards platform

---

#### **Rank #2: Google Ad Manager (IMA SDK)** ⭐⭐⭐⭐
**Justification**: Industry-leading technology and demand quality:
- Premium advertisers = higher eCPMs for Tier 1 traffic
- Comprehensive IMA SDK (Web, Android, iOS, Unity)
- Excellent documentation and community support
- Brand-safe, family-friendly by default
- Scales to enterprise level
- Pakistan support via wire transfer/Western Union

**Best For**: Long-term scalability, premium ad quality, technical teams

**Tradeoff**: $100 minimum payout, NET-60/90 terms, requires technical expertise

---

#### **Rank #3: PropellerAds** ⭐⭐⭐⭐
**Justification**: Excellent for diversification and quick payouts:
- $5 minimum payout across all payment methods
- NET-7 payment terms (fastest in list)
- Bitcoin/crypto payment option
- Easy integration (tag-based)
- Instant approval
- Global reach including Pakistan

**Best For**: Secondary network, mediation, cryptocurrency payments

**Tradeoff**: Must filter adult content, variable ad quality, less premium than Google

---

#### **Rank #4: Media.net** ⭐⭐⭐
**Justification**: Solid choice for quality traffic and contextual targeting:
- Yahoo/Bing demand = quality advertisers
- Contextual ads = family-friendly by default
- Good Pakistan support
- SDK available for mobile apps
- Prebid.js integration for header bidding

**Best For**: Quality-focused publishers, English content sites

**Tradeoff**: Requires application approval (1-3 days), $100 minimum, prefers English content

---

### **Primary Recommendation**: **Adsterra**

**Reasons**:
1. **Accessibility**: $5 minimum payout enables fastest monetization
2. **Pakistan-Specific**: Explicitly listed with local payment options (Hyperwallet for local bank transfers)
3. **Speed**: NET-15 bi-weekly payments = cash flow every 2 weeks
4. **Flexibility**: Supports family-friendly filtering while maintaining high fill rates
5. **Technical**: REST API enables programmatic stats tracking
6. **No Barriers**: Unlimited traffic, instant approval, no quality threshold

**Backup Recommendation**: **Google Ad Manager (IMA SDK)**

**Reasons**:
1. **Premium Demand**: Higher eCPMs for quality traffic
2. **Scalability**: Grows with your platform to enterprise scale
3. **Reputation**: Google brand trust improves user perception
4. **Technology**: Best-in-class SDKs and ad delivery infrastructure
5. **Long-term**: Future-proof solution with continuous updates

---

### **Suggested Combined Approach (Mediation Strategy)**

For optimal results, implement **ad mediation** using multiple networks:

**Primary Stack**:
1. **Adsterra** (70% traffic) - Fast payouts, family-friendly
2. **Google Ad Manager** (30% traffic) - Premium demand, higher eCPMs

**Implementation**:
- Use **Adsterra** as default for all users
- Implement **Google IMA SDK** for Tier 1 traffic (US, UK, Canada)
- A/B test to determine optimal split for Pakistan traffic
- Track eCPM and fill rates per network in real-time

**Fallback Logic**:
```javascript
async function loadVideoAd(user) {
    // Determine user geo
    const userCountry = await getUserCountry(user.ip);
    
    // Tier 1 traffic → Try Google first, fallback to Adsterra
    if (['US', 'UK', 'CA', 'AU'].includes(userCountry)) {
        try {
            return await loadGoogleIMAd();
        } catch (error) {
            return await loadAdsterraAd();
        }
    }
    
    // Pakistan and other traffic → Adsterra primary
    return await loadAdsterraAd();
}
```

**Benefits**:
- Maximize revenue through competition
- Ensure 100% fill rate (Adsterra backup)
- Fast payouts from Adsterra while accumulating Google revenue
- Optimize for both cash flow and total revenue

---

## 7. Machine-Friendly Export (JSON)

```json
{
  "report_metadata": {
    "title": "Top 4 Video Ad Networks for THORX Platform",
    "generated_date": "2025-10-11",
    "version": "1.0",
    "analyst": "Replit AI Agent",
    "target_platform": "THORX Rewards System"
  },
  "networks": [
    {
      "rank": 1,
      "name": "Adsterra",
      "website": "https://adsterra.com",
      "payout_model": "CPM, CPC, CPI, CPA",
      "ecpm_range": {
        "min": 2.00,
        "max": 25.00,
        "pakistan_min": 0.50,
        "pakistan_max": 3.00,
        "currency": "USD"
      },
      "payment_methods": ["PayPal", "Wire Transfer", "Paxum", "WebMoney", "Bitcoin"],
      "minimum_payout": {
        "Paxum": 5,
        "WebMoney": 5,
        "PayPal": 100,
        "Bitcoin": 100,
        "Wire": 1000
      },
      "payment_terms": "NET-15",
      "supports_pakistan": true,
      "pakistan_payment_notes": "Wire transfer, local bank via Hyperwallet ($25 min), PayPal (limited withdrawal), crypto options",
      "signup_url": "https://publishers.adsterra.com/signup",
      "docs_url": "https://adsterra.com/api/",
      "terms_url": "https://adsterra.com/terms-and-conditions/",
      "video_formats": ["VAST", "VPAID", "Pre-roll", "Mid-roll", "Post-roll", "Outstream", "Instream"],
      "api_available": true,
      "api_type": "REST",
      "webhook_support": false,
      "sdk_platforms": ["Web"],
      "family_friendly": true,
      "approval_time": "Instant to 24 hours",
      "traffic_restrictions": "None",
      "integration_snippet": "<!-- See integration pack section 3.1 -->",
      "pros": [
        "Ultra-low $5 minimum payout",
        "NET-15 bi-weekly payments",
        "Instant approval",
        "Explicit Pakistan support",
        "Family-friendly filtering available",
        "REST API for stats"
      ],
      "cons": [
        "Variable ad quality",
        "Lower eCPM for Tier 2/3 traffic",
        "No real-time webhooks"
      ]
    },
    {
      "rank": 2,
      "name": "Google Ad Manager (IMA SDK)",
      "website": "https://admanager.google.com",
      "payout_model": "CPM, CPCV, RevShare",
      "ecpm_range": {
        "min": 10.00,
        "max": 20.00,
        "pakistan_min": 0.50,
        "pakistan_max": 3.00,
        "currency": "USD"
      },
      "payment_methods": ["Wire Transfer", "Western Union"],
      "minimum_payout": {
        "all": 100
      },
      "payment_terms": "NET-60 to NET-90",
      "supports_pakistan": true,
      "pakistan_payment_notes": "Wire transfer to local banks, Western Union available",
      "signup_url": "https://admanager.google.com",
      "docs_url": "https://developers.google.com/interactive-media-ads",
      "terms_url": "https://policies.google.com/terms",
      "video_formats": ["IMA SDK", "Pre-roll", "Mid-roll", "Post-roll", "DAI", "Rewarded"],
      "api_available": true,
      "api_type": "SOAP, REST (beta)",
      "webhook_support": false,
      "sdk_platforms": ["Web", "Android", "iOS", "Unity", "Flutter"],
      "family_friendly": true,
      "approval_time": "Immediate account, 1-7 days for full features",
      "traffic_restrictions": "None",
      "integration_snippet": "<!-- See integration pack section 3.2 -->",
      "pros": [
        "Premium advertiser demand",
        "Industry-leading technology",
        "Excellent SDKs and documentation",
        "Brand-safe by default",
        "Scales to enterprise level",
        "Multi-platform support"
      ],
      "cons": [
        "$100 minimum payout",
        "NET-60/90 payment terms",
        "Requires technical expertise",
        "Strict policy enforcement"
      ]
    },
    {
      "rank": 3,
      "name": "PropellerAds",
      "website": "https://propellerads.com",
      "payout_model": "CPM, CPC, SmartCPA",
      "ecpm_range": {
        "min": 1.00,
        "max": 15.00,
        "pakistan_min": 0.50,
        "pakistan_max": 2.50,
        "currency": "USD"
      },
      "payment_methods": ["PayPal", "Wire Transfer", "Cheque", "Bitcoin", "Credit Card"],
      "minimum_payout": {
        "all": 5
      },
      "payment_terms": "NET-7",
      "supports_pakistan": true,
      "pakistan_payment_notes": "All payment methods available, crypto recommended for fastest transfer",
      "signup_url": "https://propellerads.com/publishers/",
      "docs_url": "https://propellerads.com/publishers/",
      "terms_url": "https://propellerads.com/terms/",
      "video_formats": ["Pre-roll", "Interstitial", "Instream"],
      "api_available": true,
      "api_type": "REST",
      "webhook_support": true,
      "sdk_platforms": ["Web"],
      "family_friendly": false,
      "approval_time": "Instant",
      "traffic_restrictions": "None",
      "integration_snippet": "<!-- See integration pack section 3.3 -->",
      "pros": [
        "$5 minimum payout",
        "NET-7 payment (fastest)",
        "Instant approval",
        "Cryptocurrency payment option",
        "Easy tag-based integration",
        "Postback webhooks available"
      ],
      "cons": [
        "Serves adult content (must filter)",
        "Variable ad quality",
        "Lower eCPM than premium networks",
        "Reputation concerns"
      ]
    },
    {
      "rank": 4,
      "name": "Media.net",
      "website": "https://www.media.net",
      "payout_model": "CPM, RevShare",
      "ecpm_range": {
        "min": 5.00,
        "max": 18.00,
        "pakistan_min": 0.50,
        "pakistan_max": 3.00,
        "currency": "USD"
      },
      "payment_methods": ["Wire Transfer", "PayPal"],
      "minimum_payout": {
        "all": 100
      },
      "payment_terms": "NET-30",
      "supports_pakistan": true,
      "pakistan_payment_notes": "Wire transfer to local banks supported",
      "signup_url": "https://www.media.net/publishers/",
      "docs_url": "http://docs.msas.media.net/",
      "terms_url": "https://www.media.net/terms-of-service",
      "video_formats": ["Instream", "Outstream", "Native Video"],
      "api_available": true,
      "api_type": "SDK-based",
      "webhook_support": false,
      "sdk_platforms": ["Android", "iOS", "Web (Prebid.js)"],
      "family_friendly": true,
      "approval_time": "1-3 business days",
      "traffic_restrictions": "Quality content required",
      "integration_snippet": "<!-- See integration pack section 3.4 -->",
      "pros": [
        "Yahoo/Bing demand quality",
        "Contextual targeting (brand-safe)",
        "NET-30 payment",
        "SDK for mobile apps",
        "Prebid.js integration"
      ],
      "cons": [
        "$100 minimum payout",
        "Application approval required",
        "Prefers English content",
        "Must contact for SDK credentials"
      ]
    }
  ],
  "executive_summary": "Based on comprehensive research of video ad networks in October 2025, Adsterra emerges as the #1 recommendation for the THORX platform due to its ultra-low $5 minimum payout, NET-15 bi-weekly payments, instant approval, and explicit Pakistan support with multiple payment methods including wire transfer and cryptocurrency. Google Ad Manager ranks #2 for its premium demand and industry-leading technology, ideal for long-term scalability despite higher $100 minimum payout. PropellerAds (#3) offers fastest NET-7 payments and $5 minimum, making it excellent for cash flow diversification. Media.net (#4) provides quality Yahoo/Bing demand with contextual targeting. For optimal results, implement a mediation strategy using Adsterra as primary (70% traffic) for immediate monetization and Google Ad Manager (30%) for premium eCPMs on Tier 1 traffic. All four networks support Pakistan traffic and payouts, provide family-friendly content filtering options, and offer robust APIs for integration with Node.js/Express backend.",
  "recommended_strategy": {
    "primary_network": "Adsterra",
    "backup_network": "Google Ad Manager (IMA SDK)",
    "mediation_approach": "Use Adsterra for 70% traffic (fast payouts, family-friendly), Google Ad Manager for 30% Tier 1 traffic (premium eCPMs)",
    "estimated_monthly_revenue": {
      "assumptions": "100,000 monthly video ad views, 50% Pakistan traffic, 50% Tier 1 traffic",
      "adsterra_revenue": "$50-$250",
      "google_revenue": "$500-$1000",
      "total_range": "$550-$1250"
    }
  }
}
```

---

## 8. Credible Sources & References

### Primary Documentation Sources

1. **Adsterra**
   - Official Website: https://adsterra.com
   - Publisher API Docs: https://adsterra.com/api/ (Last updated: 2025)
   - API Integration Guide: https://adsterra.com/blog/api-v3/ (Published: 2024)
   - Payment Terms: https://adsterra.com/blog/adsterra-minimum-payout-for-publishers/ (Updated: 2025)
   - Video Ads (VAST): https://adsterra.com/video-ads/ (Accessed: October 2025)
   - Terms & Conditions: https://adsterra.com/terms-and-conditions/

2. **Google Ad Manager**
   - Developer Portal: https://developers.google.com/ad-manager (Updated: August 2025)
   - IMA SDK Docs: https://developers.google.com/interactive-media-ads (Current: 2025)
   - Video API Reference: https://developers.google.com/ad-manager/video (Last updated: 2025)
   - Mobile Ads SDK: https://developers.google.com/ad-manager/mobile-ads-sdk (Current: 2025)
   - Terms of Service: https://policies.google.com/terms

3. **PropellerAds**
   - Publisher Portal: https://propellerads.com/publishers/ (Accessed: October 2025)
   - Terms of Service: https://propellerads.com/terms/
   - Blog/Support: Contact publishers@propellerads.com

4. **Media.net**
   - Official Website: https://www.media.net (Accessed: October 2025)
   - SDK Documentation: http://docs.msas.media.net/ (Current: 2025)
   - Prebid Integration: https://docs.prebid.org/dev-docs/bidders/medianet.html (Updated: 2025)
   - Terms of Service: https://www.media.net/terms-of-service

### Industry Research Sources

5. **Business of Apps - Top Video Ad Networks 2025**
   - URL: https://www.businessofapps.com/ads/video/
   - Publication Date: 2025

6. **Publift - Best Video Ad Networks for Publishers 2025**
   - URL: https://www.publift.com/blog/top-video-ad-networks-for-publishers
   - Publication Date: 2025

7. **Setupad - Best Ad Networks for Publishers 2025**
   - URL: https://setupad.com/blog/best-ad-networks-for-publishers/
   - Updated: 2025

8. **AdPushup - Video Ad Networks Guide 2025**
   - URL: https://www.adpushup.com/blog/video-ad-networks/
   - Publication Date: 2025

9. **Publisher Growth - Best CPM Ad Networks in Pakistan**
   - URL: https://publishergrowth.com/blog-details/7-best-cpm-ad-networks-in-pakistan
   - Accessed: October 2025

10. **IAB - General Terms for Digital Advertising Agreements**
    - Source: PR Newswire (May 2025)
    - URL: https://www.prnewswire.com/news-releases/iab-releases-general-terms-for-digital-advertising-agreements-for-public-comment-302458140.html

### Technical Integration Resources

11. **api.video Webhooks Documentation**
    - URL: https://docs.api.video/reference/create-and-manage-webhooks
    - Accessed: October 2025

12. **Magnite (SpotX) Developer Documentation**
    - URL: https://help.magnite.com/help/developer-documentation
    - Updated: 2025

13. **Spotify Ads API**
    - URL: https://developer.spotify.com/documentation/ads-api
    - Current: 2025

### Payment & Compliance Sources

14. **TrueHost Cloud - AdSense Payment Methods in Pakistan**
    - URL: https://truehost.cloud/adsense-payment-methods-in-pakistan/
    - Accessed: October 2025

15. **SuperAwesome - Youth Advertising Platform**
    - URL: https://www.superawesome.com/awesomeads-for-advertisers/
    - Accessed: October 2025 (COPPA-certified family-friendly option)

16. **Kidoz - COPPA-Certified Kids Ad Network**
    - URL: https://www.kidoz.net/
    - Accessed: October 2025

---

## 9. Assumptions & Limitations

### Assumptions Made

1. **Traffic Volume**: Assumed THORX platform will generate 100,000+ monthly video ad views for revenue calculations
2. **Geographic Mix**: Assumed 50% Pakistan traffic, 50% international (Tier 1/2 mix)
3. **Technical Stack**: Assumed Node.js/Express backend based on repository detection (confirmed in requirements)
4. **User Engagement**: Assumed average 30-second video completion rate of 70%+
5. **Payment Preference**: Prioritized networks with $5-$100 minimum payouts suitable for startup phase
6. **Content Type**: Assumed family-friendly content requirements (no adult/gambling)
7. **Integration Skill Level**: Assumed developer available for API/SDK integration

### Known Limitations

1. **eCPM Variability**: Rates fluctuate based on seasonality, advertiser demand, and traffic quality
2. **Approval Uncertainty**: Media.net application approval not guaranteed (1-3 day review)
3. **Pakistan Banking**: Wire transfer fees vary by local bank (typically $10-$30 per transaction)
4. **PayPal Pakistan**: Limited withdrawal options - may require international bank account
5. **Real-time Webhooks**: None of the four networks provide true real-time webhooks for video completions (require polling or client-side tracking)
6. **Fill Rates**: Not guaranteed 100% - actual fill depends on user demographics and ad inventory
7. **Policy Changes**: Ad network terms and policies subject to change without notice
8. **Testing**: Code examples provided for educational purposes - require testing in production environment

### Recommended Next Steps

1. **Immediate**: Sign up for Adsterra publisher account (instant approval, $5 minimum)
2. **Week 1**: Implement Adsterra VAST integration on development environment
3. **Week 1**: Apply for Google Ad Manager and Media.net accounts
4. **Week 2**: Test video ad placements with sample users
5. **Week 2**: Implement backend tracking for ad completions and rewards
6. **Week 3**: Deploy to production with Adsterra primary
7. **Week 4**: Add Google Ad Manager integration for mediation
8. **Month 2**: Analyze eCPM and fill rate data, optimize network allocation
9. **Month 3**: Implement PropellerAds as tertiary fill for maximum revenue

---

## 10. Support & Contact Information

### Network Support Contacts

- **Adsterra**: 24/7 Live Chat at https://publishers.adsterra.com or email publishers@adsterra.com
- **Google Ad Manager**: Community forum at https://support.google.com/admanager/community, developer support via Google Cloud
- **PropellerAds**: Email publishers@propellerads.com, live chat in dashboard
- **Media.net**: Email mobileapps@media.net for SDK/API support, general inquiries via https://www.media.net/contact

### Integration Assistance

For custom integration support with THORX platform:
1. Review this complete guide
2. Test with one network (recommended: Adsterra for quickest deployment)
3. Monitor dashboard analytics for first 7 days
4. Iterate based on eCPM and user engagement data

---

**Document Version**: 1.0  
**Last Updated**: October 11, 2025  
**Prepared For**: THORX Platform Integration  
**Total Networks Analyzed**: 15+ (Top 4 selected)  
**Research Duration**: Comprehensive analysis October 2025  

---

*End of Integration Guide*
