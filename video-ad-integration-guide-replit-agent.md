# Complete Guide: Integrating Video Ad Networks with THORX Using Replit Agent

**Last Updated:** 2025-01-06  
**Your Website:** THORX (Full-stack React/Express earning platform)  
**Current Stack:** React, Vite, Express, PostgreSQL, TailwindCSS

---

## 📋 WHAT YOU NEED BEFORE STARTING

### 1. **Choose Your Video Ad Network**

Based on the research report, you need to decide:

**Option A: Starting Small (No Traffic Requirements)**
- **Network:** Aniview
- **Best for:** New publishers, no minimum traffic
- **Next step:** Sign up at https://aniview.com

**Option B: Established Publisher (500K+ pageviews OR $2K+ revenue)**
- **Network:** Publift
- **Best for:** Maximum revenue potential
- **Next step:** Apply at https://www.publift.com/contact

**My Recommendation:** Start with Aniview, then migrate to Publift when you hit 400K pageviews.

### 2. **Get Your API Credentials**

After signing up with your chosen network, you'll receive:

**For Aniview:**
- ✅ Publisher ID (e.g., `pub_12345`)
- ✅ Channel ID (e.g., `ch_67890`)
- ✅ API Key (optional, for reporting)

**For Publift:**
- ✅ Fuse Tag ID (provided after website audit)
- ✅ Account Manager contact info

**For Generic VAST Integration:**
- ✅ VAST Tag URL (e.g., `https://ads.network.com/vast?...`)

### 3. **Decide Where Ads Will Appear**

Think about:
- [ ] Do you have video content on your site? (If yes, use in-stream ads)
- [ ] Want ads between content sections? (Use outstream/native video ads)
- [ ] Which pages? (Home, dashboard, earning pages, etc.)
- [ ] How many ads per page? (Recommendation: 1-3 max)

---

## 🤖 HOW TO WORK WITH REPLIT AGENT (Step-by-Step)

### PHASE 1: PREPARATION (Before Talking to Agent)

**Step 1:** Sign up with your chosen ad network and get credentials  
**Step 2:** Decide ad placement locations on your site  
**Step 3:** Have your credentials ready (DO NOT share them in chat yet)

### PHASE 2: INITIAL REQUEST (Your First Message to Agent)

**✅ GOOD Example Message:**

```
I want to integrate Aniview video ads into my THORX website. I need:

1. Add video ad slots on the homepage (below hero section)
2. Add ads on the dashboard page (between earning methods)
3. Use React components that work with our existing Vite setup
4. Store API credentials securely as environment variables
5. Track ad performance in our analytics

I have my Aniview Publisher ID and Channel ID ready.
```

**❌ BAD Example Message:**

```
Add ads to my site
```
*(Too vague - agent needs specifics)*

### PHASE 3: PROVIDING CREDENTIALS (When Agent Asks)

The agent will ask for your API credentials. Here's how to provide them:

**✅ CORRECT Way - Use Replit Secrets:**

1. **Wait for agent to use the `ask_secrets` tool** - The agent will automatically prompt you through the Replit UI
2. **You'll see a secrets input form** appear in the interface
3. **Enter your credentials** in the secure form (they won't appear in chat)

**Example - What agent will ask for:**
- `ANIVIEW_PUBLISHER_ID`
- `ANIVIEW_CHANNEL_ID`
- `ANIVIEW_API_KEY` (optional)

**❌ WRONG Way - Never Do This:**

```
My publisher ID is pub_12345 and my channel ID is ch_67890
```
*(Never paste API keys directly in chat - security risk!)*

### PHASE 4: INTEGRATION STEPS (What Agent Will Do)

The agent will automatically:

**Step 1: Code Integration**
- ✅ Create React components for video ads
- ✅ Add ad initialization logic
- ✅ Import required libraries (Video.js, IMA SDK, or network-specific SDK)
- ✅ Configure ad slots with your placement preferences

**Step 2: Environment Setup**
- ✅ Store your credentials in Replit Secrets (secure environment variables)
- ✅ Configure access to secrets in frontend/backend
- ✅ Add necessary npm packages

**Step 3: UI Integration**
- ✅ Add ad components to your specified pages
- ✅ Style ads to match THORX design (industrial/cinematic theme)
- ✅ Ensure responsive design (mobile, tablet, desktop)

**Step 4: Testing**
- ✅ Load test ads to verify integration
- ✅ Check error handling and fallbacks
- ✅ Test across different devices/browsers

### PHASE 5: REVIEW & FEEDBACK

**What to Check:**

1. **Visual Review:**
   - Do ads appear in the right locations?
   - Do they match your site's design?
   - Are they responsive on mobile?

2. **Functional Review:**
   - Do ads load within 5 seconds?
   - Does video content still play if ads fail?
   - Can users skip ads (if enabled)?

3. **Performance Review:**
   - Is page load time acceptable? (Check Lighthouse score)
   - Are there any console errors?

**How to Give Feedback to Agent:**

**✅ GOOD Feedback:**
```
The ads are working but I need adjustments:
1. Move the homepage ad below the "Trust Builder" section instead
2. Reduce ad size on mobile from 640px to 100% width
3. Change skip button from 5 seconds to 6 seconds
```

**❌ VAGUE Feedback:**
```
Ads don't look right, fix them
```

### PHASE 6: COMPLIANCE & PRIVACY (Agent Will Handle)

The agent will automatically:
- ✅ Update privacy policy with ad disclosure
- ✅ Add cookie consent for ad tracking (GDPR/CCPA)
- ✅ Configure "Do Not Sell My Info" for California users
- ✅ Add ad preference toggles if needed

**What Agent Needs from You:**
- Confirm your target audience regions (US, EU, global?)
- Approve privacy policy changes

---

## 💬 COMMUNICATION TEMPLATES

### Template 1: Basic Integration Request

```
I want to integrate [NETWORK_NAME] video ads into THORX. 

**Placement Locations:**
- Homepage: [specific section, e.g., "below hero"]
- Dashboard: [specific section, e.g., "above earning stats"]
- [Other page]: [location]

**Requirements:**
- Ad format: [pre-roll / outstream / both]
- Max ads per page: [number]
- Skip enabled: [yes/no]
- Mobile responsive: Yes

I have my API credentials ready. Please ask for them securely.
```

### Template 2: Migration Request (Aniview → Publift)

```
I want to migrate from Aniview to Publift. My traffic now qualifies for Publift (500K+ pageviews).

**Current Setup:**
- Using Aniview on homepage and dashboard
- 2 ad slots currently active
- All credentials stored in Replit Secrets

**New Setup:**
- Replace Aniview with Publift Fuse Tag
- Keep same ad placements
- Maintain existing analytics tracking

I have my Publift Fuse Tag ID ready. Please ask for it securely.
```

### Template 3: Troubleshooting Request

```
The video ads aren't loading correctly. Here's what I'm seeing:

**Issue:** [describe problem, e.g., "ads show blank space"]
**Where:** [page name, e.g., "homepage only"]
**Browser:** [Chrome/Firefox/Safari]
**Console Errors:** [copy/paste any red errors from browser console]

**What I've tried:**
- [e.g., "cleared cache and hard refresh"]
- [e.g., "tested in incognito mode"]

Can you help debug this?
```

---

## 🔐 SECURITY BEST PRACTICES

### DO's ✅

1. **Always use Replit Secrets** for API keys
   - Agent will use `ask_secrets` tool
   - You'll enter keys in secure UI form
   - Keys are encrypted at rest

2. **Review code changes** before approving
   - Agent will show you what files are modified
   - Check that no keys are hardcoded

3. **Test in development first**
   - Agent will use dev environment
   - Verify everything works before publishing

### DON'Ts ❌

1. **Never paste API keys in chat**
   - Even if you trust the agent
   - Even in "private" messages
   - Keys could leak in logs

2. **Don't skip the review step**
   - Always check privacy policy updates
   - Review ad placement locations
   - Test on multiple devices

3. **Don't use production database for testing**
   - Agent uses dev database by default
   - This protects your real user data

---

## 📊 WHAT TO EXPECT DURING INTEGRATION

### Timeline

**Total Time:** 30-60 minutes for complete integration

| Phase | Duration | What Happens |
|-------|----------|--------------|
| **Preparation** | 5-10 min | You gather credentials and requirements |
| **Initial Request** | 2 min | You send structured request to agent |
| **Code Integration** | 10-15 min | Agent writes code, installs packages |
| **Secret Setup** | 3-5 min | You enter API keys via secure form |
| **Testing** | 10-15 min | Agent tests, you review and provide feedback |
| **Refinement** | 5-10 min | Agent makes adjustments based on your feedback |
| **Compliance** | 5-10 min | Agent updates privacy policies and consent |

### What Agent Will Create

**New Files:**
- `client/src/components/VideoAd.tsx` - Main ad component
- `client/src/components/VideoAdPlayer.tsx` - Video player with ads (if needed)
- `client/src/lib/adConfig.ts` - Ad network configuration

**Modified Files:**
- `client/src/pages/HomePage.tsx` - Add ad slots
- `client/src/pages/Dashboard.tsx` - Add ad slots (if requested)
- `.env` - Reference to secrets (not actual values)
- Privacy policy pages (if exist)

**Installed Packages:**
- `video.js` (if using Video.js integration)
- `videojs-ima` (for Google IMA SDK)
- Network-specific SDKs (Aniview, Publift scripts loaded via CDN)

---

## 🧪 TESTING CHECKLIST (What You Should Verify)

After agent completes integration, test:

### Functional Tests
- [ ] Ads load within 5 seconds
- [ ] Video content plays after ads
- [ ] Skip button works (if enabled)
- [ ] Click-through opens advertiser page
- [ ] Error handling: content plays if ads fail

### Visual Tests
- [ ] Ads fit properly on desktop (no overflow)
- [ ] Ads are responsive on mobile
- [ ] Ads match site design/theme
- [ ] Loading states show (skeleton/spinner)

### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] Lighthouse score > 80
- [ ] Core Web Vitals pass

### Privacy Tests
- [ ] Cookie consent banner appears
- [ ] "Do Not Sell" link works (CCPA)
- [ ] Privacy policy mentions ads
- [ ] Opt-out respects user choice

---

## 🚨 COMMON ISSUES & HOW TO REPORT THEM

### Issue 1: Ads Not Loading

**What to Tell Agent:**
```
Ads aren't loading on [PAGE_NAME]. I see [blank space / error message / infinite loading].

Browser console shows:
[paste error message]

I've tested in Chrome and Firefox, same issue on both.
```

### Issue 2: Ads Breaking Layout

**What to Tell Agent:**
```
Ads are pushing other content off-screen on mobile. 

Affected pages: [list pages]
Device tested: [iPhone 14 / Android tablet / etc.]

Screenshot: [describe or ask how to share]
```

### Issue 3: Revenue Not Tracking

**What to Tell Agent:**
```
Ads are showing but revenue isn't appearing in [NETWORK_NAME] dashboard.

Setup: [network name]
Ads served: [yes, I can see them]
Dashboard shows: [0 impressions / no data]

Timeframe: [when did I start testing?]
```

---

## 📈 POST-INTEGRATION: MONITORING & OPTIMIZATION

### Week 1: Monitor These Metrics

Agent can help you set up tracking for:
- **Impressions:** How many ads served
- **Fill Rate:** % of ad requests filled
- **Viewability:** % of ads actually seen
- **eCPM:** Revenue per 1,000 impressions
- **Page Performance:** Load time impact

**Request to Agent:**
```
Can you add analytics tracking for video ad performance? I want to track:
- Ad impressions
- Fill rate
- Revenue (eCPM)
- Page load time impact

Send events to our existing analytics setup.
```

### Weeks 2-4: Optimization

**Requests to Agent:**
- "Increase ad frequency from 1 to 2 per session"
- "Add mid-roll ads to long-form content"
- "A/B test ad placement: top vs. bottom of page"
- "Add reward system: users get 10 points per ad view"

---

## 🎯 EXAMPLE: COMPLETE INTEGRATION SESSION

Here's a real example of how your conversation with agent should flow:

### **You (Initial Request):**
```
I want to integrate Aniview video ads into THORX. 

Placement:
- Homepage: Below the "Earning Reveal" section, before "Trust Builder"
- Dashboard: Above the earning methods grid

Requirements:
- Outstream video ads (non-intrusive)
- Max 1 ad per page
- 5-second skip option
- Mobile responsive
- Match our dark industrial theme

I have Aniview Publisher ID and Channel ID ready.
```

### **Agent Response:**
```
I'll integrate Aniview video ads into your THORX website with the specifications you provided.

[Agent uses ask_secrets tool]

Please provide your Aniview credentials securely using the form that will appear.
```

### **You (Via Secrets Form):**
```
[Enter in the secure UI form, not in chat:]
ANIVIEW_PUBLISHER_ID: pub_abc123
ANIVIEW_CHANNEL_ID: ch_xyz789
```

### **Agent:**
```
[Creates components, installs packages, integrates ads]

I've completed the integration. The ads are now:
- Homepage: Below Earning Reveal section ✅
- Dashboard: Above earning methods ✅
- Styled to match dark theme ✅
- Mobile responsive ✅

Please test and let me know if you need adjustments.
```

### **You (After Testing):**
```
Great work! Two small adjustments:

1. Homepage ad: Move it 20px lower (more spacing)
2. Dashboard ad: Reduce width to 90% on mobile

Everything else looks perfect!
```

### **Agent:**
```
[Makes adjustments]

Done! I've updated:
1. Homepage ad spacing increased by 20px
2. Dashboard ad width reduced to 90% on mobile (max-width: 640px)

Please verify the changes.
```

### **You:**
```
Perfect! Now please add:
- Cookie consent for ad tracking (GDPR)
- Privacy policy update mentioning Aniview

Then we're done.
```

### **Agent:**
```
[Implements compliance features]

All set! I've added:
✅ Cookie consent banner (IAB TCF 2.2 compliant)
✅ Privacy policy updated with Aniview disclosure
✅ CCPA "Do Not Sell" link in footer

Your video ad integration is complete and compliant.
```

---

## 🔄 MIGRATION GUIDE (Aniview → Publift)

When you're ready to upgrade to Publift:

### Step 1: Verify Eligibility
- Check traffic: ≥500K pageviews/month OR ≥$2K revenue/month
- Apply at https://www.publift.com/contact

### Step 2: Request Migration from Agent

```
I'm ready to migrate from Aniview to Publift. My Publift account is approved.

Current setup:
- 2 ad slots (homepage, dashboard)
- Using Aniview components

New Publift credentials:
- Fuse Tag ID: [I'll provide via secrets]

Please:
1. Replace Aniview with Publift
2. Keep existing ad placements
3. Maintain analytics tracking
4. Test before going live
```

### Step 3: Agent Will
- Replace Aniview SDK with Publift Fuse Tag
- Update environment variables
- Test new integration
- Verify revenue tracking

### Step 4: Verify
- Ads still load correctly
- Revenue appears in Publift dashboard (24-48 hours)
- Performance unchanged

---

## 📞 GETTING HELP

### From Replit Agent

**Quick Questions:**
```
How do I [specific task]?
```

**Debugging:**
```
I'm seeing this error: [paste error]
Can you help debug?
```

**Feature Requests:**
```
Can you add [specific feature]?
```

### From Ad Networks

**Aniview Support:**
- Email: info@aniview.com
- 24/7 support available

**Publift Support:**
- Contact: https://www.publift.com/contact
- Dedicated account manager (after approval)

---

## ✅ FINAL CHECKLIST

Before going live, ensure:

**Technical:**
- [ ] Ads load successfully on all pages
- [ ] Mobile responsive (test on real devices)
- [ ] No console errors
- [ ] Page load time < 3 seconds
- [ ] Error handling works (content plays if ads fail)

**Compliance:**
- [ ] Privacy policy updated
- [ ] Cookie consent implemented
- [ ] GDPR/CCPA compliant
- [ ] User opt-out functional

**Business:**
- [ ] Revenue tracking configured
- [ ] Analytics events firing
- [ ] Ad network dashboard showing data
- [ ] Backup ad provider configured (optional)

**User Experience:**
- [ ] Ads aren't intrusive
- [ ] Skip button works (if enabled)
- [ ] Ads match site design
- [ ] Mobile experience smooth

---

## 🎉 SUCCESS CRITERIA

You'll know the integration is successful when:

1. ✅ **Ads Load:** Video ads appear within 5 seconds on designated pages
2. ✅ **Revenue Flows:** Dashboard shows impressions and revenue within 24-48 hours
3. ✅ **UX Maintained:** User engagement (time on site, bounce rate) unchanged
4. ✅ **Performance Good:** Page load < 3 seconds, Lighthouse > 80
5. ✅ **Compliant:** Privacy policies updated, consent working
6. ✅ **Scalable:** Can easily add more ad slots or switch networks

---

## 📚 QUICK REFERENCE

**Start Integration:**
```
I want to integrate [Aniview/Publift] ads on [pages].
I have credentials ready.
```

**Provide Secrets:**
- Wait for agent's secure form
- Never paste keys in chat

**Request Changes:**
```
Please adjust:
1. [specific change]
2. [specific change]
```

**Test & Verify:**
- Check all pages
- Test mobile
- Review console
- Verify revenue tracking

**Go Live:**
```
Everything looks good, please deploy to production.
```

---

**Need more help?** Just ask the agent specific questions as they come up. The agent is here to help you through every step of the integration process!
