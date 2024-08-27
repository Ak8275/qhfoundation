const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const csvFilePath = path.join(__dirname, 'data.csv');

async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function runQuiz(name, email, accessCode) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.quickhealfoundation.org/cyber-challenge/', { waitUntil: 'networkidle2' });

    // Wait for the "Start" button to be visible on the page
    await page.waitForSelector('.ays_next.start_button', { visible: true });

    // Click the Start button
    await page.click('.ays_next.start_button');
    await delay(4000); // Wait for 4 seconds

    // Fill in the name
    await page.waitForSelector('#ays_form_field_ays_user_name_5', { visible: true });
    await page.type('#ays_form_field_ays_user_name_5', name);

    // Fill in the email address
    await page.waitForSelector('#ays_form_field_ays_user_email_5', { visible: true });
    await page.type('#ays_form_field_ays_user_email_5', email);

    // Fill in the access code
    await page.waitForSelector('#ays_form_field_quiz_attr_1_5', { visible: true });
    await page.type('#ays_form_field_quiz_attr_1_5', accessCode);

    // Click the Next button to proceed
    await page.waitForSelector('input[name="next"]', { visible: true });
    await page.click('input[name="next"]');
    await delay(4000); // Wait for 4 seconds

    // Loop through all the questions
    for (let i = 0; i < 5; i++) { // Assuming there are 5 questions
        // Wait for the question to load
        await page.waitForSelector('.ays_quiz_question', { visible: true });

        // Select a random answer for the current question
        const options = await page.$$('.ays_list_view_item');
        if (options.length === 0) {
            console.error('No options found for the question');
            break;
        }
        
        // Pick a random option and click it
        const randomIndex = Math.floor(Math.random() * options.length);
        const randomOption = options[randomIndex];
        
        // Ensure the option is visible and interactable
        await randomOption.scrollIntoView(); // Scroll to the element
        await delay(1000); // Wait a moment to ensure the element is in view
        await randomOption.click();

        // Click the Next button
        await page.waitForSelector('input[name="next"]', { visible: true });
        await page.click('input[name="next"]');
        await delay(4000); // Wait for 4 seconds
    }

    // Click the "See Result" button after answering all questions
    await page.waitForSelector('input[name="ays_finish_quiz"]', { visible: true });
    await page.click('input[name="ays_finish_quiz"]');
    await delay(4000); // Wait for 4 seconds

    await browser.close();
}

// Read the CSV file and process each row sequentially
async function processCSV() {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                // Ensure correct column names are used
                const { Name, Email, 'Access Code': AccessCode } = row;
                results.push({ name: Name, email: Email, accessCode: AccessCode });
            })
            .on('end', async () => {
                for (const { name, email, accessCode } of results) {
                    await runQuiz(name, email, accessCode);
                }
                resolve();
            })
            .on('error', reject);
    });
}

processCSV().then(() => {
    console.log('All quizzes have been processed.');
}).catch((error) => {
    console.error('An error occurred:', error);
});
