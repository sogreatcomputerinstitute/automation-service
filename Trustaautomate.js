const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const sendAndCleanupScreenshots = require('./sendfeedback.js');

require('dotenv').config();

// Ensure the folder exists right away so Puppeteer doesn't throw directory errors
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)){
    fs.mkdirSync(screenshotDir);
}

let totaltimespent = 0;
let timerInterval; // Variable to hold our interval reference

function timer(){
    totaltimespent = totaltimespent + 1;
}

async function Trustatask() {
    console.log('Opening browser window to watch the task live...');

    const sessionPath = path.join(__dirname, 'browser_session');

    const browser = await puppeteer.launch({
        headless: true, 
        defaultViewport: { width: 1280, height: 800 }, 
        userDataDir: sessionPath,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage' 
        ]
    });

    const page = await browser.newPage();

    try {
        console.log('Navigating to Trusta...');
        await page.goto('https://trusta.live/login', { waitUntil: 'networkidle2', timeout: 90000 });

        // Check if we are already logged in or if we got sent to a login screen
        const isLoginPage = await page.evaluate(() => {
            return document.querySelector('input[type="password"]') !== null;
        });

        if (isLoginPage) {
            console.log('Login screen detected. Proceeding with credentials...');
            
            // FIXED: Assigned interval to a variable so we can clear it later
            timerInterval = setInterval(timer, 1000);

            const emailSelector = 'input[type="text"]';
            await page.waitForSelector(emailSelector);
            await page.type(emailSelector, process.env.USER_EMAIL || "");
            console.log('User email entered.');

            const passwordSelector = 'input[type="password"]';
            await page.waitForSelector(passwordSelector);
            await page.type(passwordSelector, process.env.USER_PASS || "");
            console.log('Password entered.');

            console.log('Searching for "Log in" button...');
            const login_button = 'button[type=submit]';
            await page.waitForSelector(login_button);
            
            // FIXED: Safer click-and-wait navigation handling
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
                page.click(login_button)
            ]);
            console.log('Successfully logged in and redirected!');
        } else {
            console.log('Already logged in via session cache. Proceeding straight to tasks...');
        }

        // --- FIXED: TASK EXECUTION MOVED OUTSIDE OF LOGIN IF-BLOCK ---
         await page.screenshot({ path: './screenshots/homepage.png', fullPage: true });
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 1. REGULAR TASKS
        console.log('Navigating to regular tasks...');
        // FIXED: Shifted to domcontentloaded with a safer 30s timeout execution
        await page.goto('https://trusta.live/tasks', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const TaskButton = 'button[data-slot="button"]';
        try {
            await page.waitForSelector(TaskButton, { timeout: 10000 });
            await page.click(TaskButton);
            console.log("Regular task button clicked.");
            await page.screenshot({ path: './screenshots/task_clicked.png', fullPage: true });
        } catch (e) {
            await page.screenshot({ path: './screenshots/task_missing_error.png', fullPage: true });
            console.log("Regular Task button missing or already clicked, skipping...");
        }

        await new Promise(resolve => setTimeout(resolve, 5000));

        // 2. SPONSORED TASKS
        console.log('Navigating to sponsored tasks...');
        await page.goto('https://trusta.live/sponsored', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const sponsoredTaskButton = 'button[data-slot="button"]';
        try {
            await page.waitForSelector(sponsoredTaskButton, { timeout: 10000 });
            await page.click(sponsoredTaskButton);
            console.log("Sponsored task button clicked.");
            await page.screenshot({ path: './screenshots/sponsored_task_clicked.png', fullPage: true });
        } catch (e) {
            await page.screenshot({ path: './screenshots/sponsored_missing_error.png', fullPage: true });
            console.log("Sponsored Task Already Done or Missing.");
        }

    } catch (error) {
        console.error('An error occurred during execution:', error);
    } finally {
        await page.goto('https://trusta.live/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
        // FIXED: Stop interval timer safely
        if (timerInterval) clearInterval(timerInterval);
        await new Promise(resolve => setTimeout(resolve, 5000));
         await page.screenshot({ path: './screenshots/home_final.png', fullPage: true });
        // FIXED: date.toDateString() inline formatting applied cleanly
        const dateString = new Date().toDateString();
        console.log(`Execution wrapped up. Total time spent tracking: ${totaltimespent}s`);
        
        console.log('Dispatching telemetry payloads and clearing local workspace...');
        await sendAndCleanupScreenshots(
            `Dear User, Your task for today (${dateString}) has been processed. Total time monitored: ${totaltimespent} seconds. Please check screenshots below.`, 
            'https://askninjabot.onrender.com/forwardfeedback'
        );
        
        await browser.close();
        console.log('Browser closed safely.');
    }
}

module.exports = Trustatask;
