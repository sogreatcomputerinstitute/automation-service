const express = require('express');
const cron = require('node-cron');
const Trustatask = require('./Trustaautomate.js');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('./public'))

// ==========================================
// 🕒 AUTOMATED DAILY SCHEDULE
// ==========================================
// This schedules the script to run automatically every day at 8:00 AM.
// Syntax: (Minute Hour Day-of-Month Month Day-of-Week)
cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Midnight schedule reached. Launching automation...');
    try {
        await Trustatask();
    } catch (error) {
        console.error('[CRON] Automated daily job failed:', error);
    }
});

cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Second Check Triggered reached. Launching automation...');
    try {
        await Trustatask();
    } catch (error) {
        console.error('[CRON] Automated daily job failed:', error);
    }
});

// ==========================================
// 🌐 WEB ROUTES & MONITORING
// ==========================================

// Route to manually test/trigger the automation via your web browser
app.get('/trigger-job', async (req, res) => {
    console.log('[WEB] Manual trigger requested.');
    
    // We run this asynchronously so your web browser page doesn't spin forever
    // while waiting for Puppeteer to finish navigating the site.
    Trustatask()
        .then(() => console.log('[WEB] Manual job finished execution.'))
        .catch(err => console.error('[WEB] Manual job error:', err));

    res.send('<h3>Automation script triggered!</h3><p>Look at your desktop/terminal to watch the browser work live.</p>');
});

// Basic server health check page
// app.get('/', (req, res) => {
//     res.send(`
//         <h1>CheetahMall Bot Server</h1>
//         <p>Status: <strong style="color: green;">Running</strong></p>
//         <p>Daily Cron Job: Scheduled for 08:00 AM every day.</p>
//         <hr />
//         <a href="/trigger-job" style="padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">
//             Trigger Bot Manually Now
//         </a>
//     `);
// });

// Start the Express web server
app.listen(PORT, () => {
    console.log(`==================================================================`);
    console.log(`== 🚀 Server successfully started on http://localhost:${PORT}      ==`);
    console.log(`== ⏰ Daily automation schedule initialized for 8:00 AM.        ==`);
    console.log(`==================================================================`);
});
