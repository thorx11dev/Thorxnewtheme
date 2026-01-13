# Video Ad Networks Integration - Quick Start Guide

## 📦 Package Contents

This package contains everything you need to integrate the top 4 video ad networks into the THORX platform:

```
├── VIDEO_AD_NETWORKS_INTEGRATION_GUIDE.md  # Complete integration guide
├── video_ad_networks_export.json           # Machine-readable data export
├── README_VIDEO_ADS.md                     # This file
└── integrations/
    ├── adsterra-backend.js                 # Adsterra Node.js integration
    ├── adsterra-frontend.html              # Adsterra frontend example
    └── google-ima-frontend.html            # Google IMA SDK example
```

## 🚀 Quick Start (Recommended Path)

### Step 1: Sign Up for Adsterra (5 minutes)
1. Visit: https://publishers.adsterra.com/signup
2. Complete registration (instant approval)
3. Add your website domain
4. Create a **VAST/VPAID Video Ad** placement
5. Copy your **Placement ID**

### Step 2: Get API Credentials (2 minutes)
1. Login to Adsterra dashboard
2. Navigate to: **Settings → API**
3. Click **"Generate New Token"**
4. Copy the token immediately (won't be shown again)
5. Add to your `.env` file:
   ```
   ADSTERRA_API_KEY=your_token_here
   ```

### Step 3: Install Dependencies
```bash
npm install axios express
```

### Step 4: Integrate Backend
Copy `integrations/adsterra-backend.js` to your `server/` directory and import:

```javascript
// server/index.js
const { router: adsterraRouter } = require('./adsterra-backend');
app.use(adsterraRouter);
```

### Step 5: Add Frontend
Copy the video ad HTML from `integrations/adsterra-frontend.html` or integrate into your React components.

### Step 6: Test
1. Load the page with the video ad
2. Watch the ad to completion
3. Check browser console for "Ad completed" message
4. Verify points awarded in your database

## 📊 Expected Results

**Timeline to First Payout**:
- **Adsterra**: 15-30 days (NET-15 bi-weekly, $5 minimum via Paxum)
- **Google Ad Manager**: 60-90 days (NET-60/90, $100 minimum)

**Estimated Revenue** (100,000 monthly video views):
- **Pakistan traffic (50%)**: $25-$150/month
- **Tier 1 traffic (50%)**: $500-$1000/month
- **Total**: $525-$1150/month

## 🎯 Network Comparison

| Network | Min Payout | Payment Speed | Best For |
|---------|-----------|---------------|----------|
| **Adsterra** | $5 | NET-15 ⚡ | Quick deployment, Pakistan |
| **Google IMA** | $100 | NET-60/90 | Premium quality, scale |
| **PropellerAds** | $5 | NET-7 ⚡⚡⚡ | Fastest payouts |
| **Media.net** | $100 | NET-30 | Contextual targeting |

## 📖 Full Documentation

For complete integration guides, API references, legal compliance, and risk analysis, see:
- **VIDEO_AD_NETWORKS_INTEGRATION_GUIDE.md** (comprehensive 10,000+ word guide)
- **video_ad_networks_export.json** (machine-readable data)

## 🔐 Security Checklist

- [ ] Store API keys in `.env` file (never commit to git)
- [ ] Add `.env` to `.gitignore`
- [ ] Validate all user input on server-side
- [ ] Implement rate limiting on ad completion endpoints
- [ ] Use HTTPS for all API communications
- [ ] Verify ad completion events server-side (don't trust client)

## 🆘 Support

**Adsterra**: 
- 24/7 Live Chat: https://publishers.adsterra.com
- Email: publishers@adsterra.com

**Google Ad Manager**:
- Community: https://support.google.com/admanager/community
- Documentation: https://developers.google.com/ad-manager

**PropellerAds**:
- Email: publishers@propellerads.com

**Media.net**:
- Email: mobileapps@media.net

## 📈 Next Steps

1. ✅ **Week 1**: Deploy Adsterra integration
2. ✅ **Week 2**: Apply for Google Ad Manager & Media.net
3. ✅ **Week 3**: Test with real users, monitor eCPMs
4. ✅ **Week 4**: Implement mediation (Adsterra 70%, Google 30%)
5. ✅ **Month 2**: Optimize based on analytics
6. ✅ **Month 3**: Add PropellerAds as fill network

## 💡 Pro Tips

1. **Start with Adsterra** - lowest barrier, fastest payouts
2. **Track eCPM daily** - optimize network allocation
3. **Enable family-friendly filtering** - maintain brand safety
4. **Use mediation** - maximize revenue with multiple networks
5. **Monitor dashboard** - catch policy issues early

---

**Document Version**: 1.0  
**Last Updated**: October 11, 2025  
**Prepared For**: THORX Platform  

For questions or custom integration support, refer to the main integration guide.
