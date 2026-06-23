const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const sendAndCleanupScreenshots = require('./sendfeedback.js');

require('dotenv').config();

// Ensure the root screenshots folder exists right away
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)){
    fs.mkdirSync(screenshotDir);
}

// Sample JSON array variable holding multiple user accounts.
// You can expand this array or load it from an external .json file.
const usersToProcess = [
    {
        email: process.env.USER_EMAIL,
        pass: process.env.USER_PASS,
        telegramid: "2141241"
    },
    {
        email: "akatareynold@gmail.com",
        pass: "Reynold2011.",
        telegramid: "8861514645"
    }
];

async function runSingleUserTask(userCredentials, index) {
    let totaltimespent = 0;
    let timerInterval;

    function timer(){
        totaltimespent = totaltimespent + 1;
    }

    console.log(`\n--- Starting Task for User [${index + 1}/${usersToProcess.length}]: ${userCredentials.email} ---`);

    // Create a unique browser session directory per user to avoid login session bleeding
    const sanitizedEmail = userCredentials.email.replace(/[^a-zA-Z0-9]/g, '_');
    const sessionPath = path.join(__dirname, `browser_session_${sanitizedEmail}`);

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
            
            timerInterval = setInterval(timer, 1000);

            const emailSelector = 'input[type="text"]';
            await page.waitForSelector(emailSelector);
            await page.type(emailSelector, userCredentials.email);
            console.log('User email entered.');

            const passwordSelector = 'input[type="password"]';
            await page.waitForSelector(passwordSelector);
            await page.type(passwordSelector, userCredentials.pass);
            console.log('Password entered.');

            console.log('Searching for "Log in" button...');
            const login_button = 'button[type=submit]';
            await page.waitForSelector(login_button);
            
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
                page.click(login_button)
            ]);
            console.log('Successfully logged in and redirected!');
        } else {
            console.log('Already logged in via session cache. Proceeding straight to tasks...');
            timerInterval = setInterval(timer, 1000); // Start tracking time for cached runs too
        }

        await page.screenshot({ path: `./screenshots/homepage_${sanitizedEmail}.png`, fullPage: true });
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 1. REGULAR TASKS
        console.log('Navigating to regular tasks...');
        await page.goto('https://trusta.live/tasks', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const TaskButton = 'button[data-slot="button"]';
        try {
            await page.waitForSelector(TaskButton, { timeout: 10000 });
            await page.click(TaskButton);
            console.log("Regular task button clicked.");
            await page.screenshot({ path: `./screenshots/task_clicked_${sanitizedEmail}.png`, fullPage: true });
        } catch (e) {
            await page.screenshot({ path: `./screenshots/task_missing_error_${sanitizedEmail}.png`, fullPage: true });
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
            await page.screenshot({ path: `./screenshots/sponsored_task_clicked_${sanitizedEmail}.png`, fullPage: true });
        } catch (e) {
            await page.screenshot({ path: `./screenshots/sponsored_missing_error_${sanitizedEmail}.png`, fullPage: true });
            console.log("Sponsored Task Already Done or Missing.");
        }

    } catch (error) {
        console.error(`An error occurred during execution for ${userCredentials.email}:`, error);
    } finally {
        try {
            await page.goto('https://trusta.live/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log("Dashboard navigation on cleanup timed out, wrapping up anyway.");
        }

        if (timerInterval) clearInterval(timerInterval);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
            await page.screenshot({ path: `./screenshots/home_final_${sanitizedEmail}.png`, fullPage: true });
        } catch (e) {}

        const dateString = new Date().toDateString();
        console.log(`Execution wrapped up for ${userCredentials.email}. Total time spent tracking: ${totaltimespent}s`);
        
        console.log('Dispatching telemetry payloads and clearing local workspace...');
        await sendAndCleanupScreenshots(
            `Dear User (${userCredentials.email}), Your task for today (${dateString}) has been processed. Total time monitored: ${totaltimespent} seconds. Please check screenshots below.`, 
            'https://askninjabot.onrender.com/forwardfeedback',
            `${telegramid}`
        );
        
        await browser.close();
        console.log(`Browser closed safely for ${userCredentials.email}.`);
    }
}

// Master function to execute all tasks in order
async function Trustatask() {
    for (let i = 0; i < usersToProcess.length; i++) {
        await runSingleUserTask(usersToProcess[i], i);
    }
    console.log('\n✅ All user automation tasks completed successfully.');
}

module.exports = Trustatask;
