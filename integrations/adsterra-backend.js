// Adsterra Video Ads Integration - Backend (Node.js/Express)
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Adsterra Publisher API configuration
const ADSTERRA_API_URL = 'https://api.adsterra.com';
const API_KEY = process.env.ADSTERRA_API_KEY; // Store securely in .env file

/**
 * Fetch ad statistics from Adsterra API
 * Endpoint: GET /publisher/stats
 * @param {string} startDate - Format: YYYY-MM-DD
 * @param {string} endDate - Format: YYYY-MM-DD
 * @returns {Object} Ad statistics
 */
async function getAdsterraStats(startDate, endDate) {
    try {
        const response = await axios.get(`${ADSTERRA_API_URL}/publisher/stats`, {
            headers: {
                'X-API-Key': API_KEY
            },
            params: {
                start: startDate,
                end: endDate,
                group_by: 'geo,domain' // Optional: group by geography and domain
            }
        });
        
        console.log('Adsterra stats fetched successfully');
        return response.data;
    } catch (error) {
        console.error('Adsterra API Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Track video ad completion and award user points
 * POST /api/adsterra/ad-completion
 */
router.post('/api/adsterra/ad-completion', async (req, res) => {
    const { userId, adNetwork, timestamp } = req.body;
    
    // Validate ad network
    if (adNetwork !== 'adsterra') {
        return res.status(400).json({ error: 'Invalid ad network' });
    }
    
    try {
        // Validate user exists (adjust based on your database setup)
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
 * Get Adsterra statistics for dashboard
 * GET /api/adsterra/stats
 */
router.get('/api/adsterra/stats', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    try {
        const stats = await getAdsterraStats(startDate, endDate);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Adsterra stats' });
    }
});

/**
 * Daily cron job to sync stats from Adsterra API
 * Call this function daily using a cron job or scheduler
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
        
        console.log(`✅ Synced Adsterra stats for ${dateStr}`);
    } catch (error) {
        console.error('❌ Failed to sync Adsterra stats:', error);
    }
}

module.exports = { router, syncDailyStats, getAdsterraStats };
