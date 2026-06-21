const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const sendAndCleanupScreenshots = require('./sendfeedback.js');
const { clearInterval } = require('timers');

require('dotenv').config();

// Ensure the folder exists right away so Puppeteer doesn't throw directory errors
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)){
    fs.mkdirSync(screenshotDir);
}

let totaltimespent = 0

async function Trustatask() {
    console.log('Opening browser window to watch the task live...');

    const sessionPath = path.join(__dirname, 'browser_session');

 const browser = await puppeteer.launch({
        headless: true, // Perfect for Render
        defaultViewport: { width: 1280, height: 800 }, // Set standard desktop size instead of null/maximized
        userDataDir: sessionPath,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage' // Prevents memory crashes on cloud servers
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
             setInterval(timer, 1000)
            const emailSelector = 'input[type="text"]';
            await page.waitForSelector(emailSelector);
            await page.type(emailSelector, process.env.USER_EMAIL);
            console.log('User email entered.');

            const passwordSelector = 'input[type="password"]';
            await page.waitForSelector(passwordSelector);
            await page.type(passwordSelector, process.env.USER_PASS);
            console.log('Password entered.');

            console.log('Searching for "Log in" button...');
            const login_button = 'button[type=submit]';
            await page.waitForSelector(login_button);
            if (login_button) console.log("Login Button Found!")
            await page.click(login_button);

            console.log('Click processed. Waiting for navigation to complete...');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            console.log('Successfully logged in and redirected!');

            await page.goto('https://trusta.live/tasks', { waitUntil: 'networkidle2', timeout: 5000 });
            const TaskButton = 'button[data-slot="button"]';

            if (!TaskButton) console.log("Task Already Clicked!")
            try {
                await page.waitForSelector(TaskButton)
                await page.click(TaskButton)
                await page.screenshot({ path: './screenshots/task_clicked.png', fullPage: true });
            } catch (e) {
                await page.screenshot({ path: './screenshots/task_clicked.png', fullPage: true });
                console.log("Button missing, skipping...");
            }

            await new Promise(resolve => setTimeout(resolve, 5000));

            await page.goto('https://trusta.live/sponsored', { waitUntil: 'networkidle2', timeout: 90000 });
            const sponsoredTaskButton = 'button[data-slot="button"]';
            try{
                await page.waitForSelector(sponsoredTaskButton)
                await page.screenshot({ path: './screenshots/sponsored_task_clicked.png', fullPage: true });
                await page.click(sponsoredTaskButton)
            }catch(e){
                await page.screenshot({ path: './screenshots/task_clicked.png', fullPage: true });
                console.log("Sponsored Task Already Done")
            }
        } else {
            console.log('Already logged in. Proceeding to tasks...');
        }
    } catch (error) {
        console.error('An error occurred during execution:', error);
    } finally {
        let date = new Date()
        date.toDateString()
        clearInterval()
        await sendAndCleanupScreenshots(`Dear User Your task for this day ${date} has been completed please check screenshots below`, 'https://askninjabot.onrender.com/forwardfeedback');
        await new Promise(resolve => setTimeout(resolve, 10000));
        await browser.close();
        console.log('Browser closed safely.');
    }
}

function timer(){
totaltimespent = totaltimespent + 1
}

module.exports = Trustatask
