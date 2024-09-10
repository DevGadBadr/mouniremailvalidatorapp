import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';

async function searchEmailsInFolder(imap, folderName) {
    try {
        const openBox = await openFolder(imap, folderName);

        const searchResults = await searchAllEmails(imap);
        if (searchResults.length === 0) return 'Code Not Sent';

        for (let emailId of searchResults) {
            const email = await fetchEmail(imap, emailId);
            const code = await extractCodeFromEmail(email);
            if (code) return code; // Return the OTP as soon as it's found
        }

        return 'Code Not Sent'; // Return this if no OTP was found
    } catch (err) {
        console.error(`An error occurred while searching in ${folderName}: ${err}`);
        return 'Code Not Sent';
    }
}

function openFolder(imap, folderName) {
    return new Promise((resolve, reject) => {
        imap.openBox(folderName, true, (err, box) => {
            if (err) reject(err);
            else resolve(box);
        });
    });
}

function searchAllEmails(imap) {
    return new Promise((resolve, reject) => {
        imap.search(['ALL'], (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

function fetchEmail(imap, emailId) {
    return new Promise((resolve, reject) => {
        const fetch = imap.fetch(emailId, { bodies: '' });
        fetch.on('message', (msg, seqno) => {
            msg.on('body', async (stream, info) => {
                try {
                    const parsed = await simpleParser(stream);
                    resolve(parsed);
                } catch (err) {
                    reject(err);
                }
            });
        });
        fetch.on('error', (err) => reject(err));
    });
}

function extractCodeFromEmail(parsed) {
    if (parsed.subject && parsed.subject.includes('Amazon')) {
        if (parsed.html) {
            const $ = cheerio.load(parsed.html);
            const otpElements = $('.otp');
            if (otpElements.length > 0) {
                return otpElements.text().trim();
            }
        }
    }
    return null;
}

export async function getCode(username, password) {
    const imap = new Imap({
        user: username,
        password: password,
        host: 'outlook.office365.com',
        port: 993,
        tls: true
    });

    return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
            try {
                let code = await searchEmailsInFolder(imap, 'INBOX');
                if (code === 'Code Not Sent') {
                    code = await searchEmailsInFolder(imap, 'JUNK');
                }
                resolve(code);
            } catch (err) {
                reject(`An error occurred: ${err}`);
            } finally {
                imap.end();
            }
        });

        imap.once('error', (err) => {
            reject(`LogIn Failed, Account is Blocked: ${err}`);
        });

        imap.connect();
    });
};


export async function codeFromPupy(page,email,password) {
    try {
        // Look in Inbox
        await page.locator('div ::-p-text(Verify your new Amazon account)').click({ timeout: 5000 });
        const element  = await page.waitForSelector('.x_otp');
        const code = await page.evaluate(element => element.textContent, element);
        return code
        
    } catch (error) {
        // Look in Junk
        try {
                
            const element = await page.waitForSelector('::-p-xpath(//*[@id="TopBar"]/div[1]/button/span/i/span/i)');
            await element.click()
            await page.locator('div ::-p-text(Junk Email)').click();
            await page.locator('div ::-p-text(Verify your new Amazon account)').click({ timeout: 5000 });
            const element2  = await page.waitForSelector('.x_otp');
            const code = await page.evaluate(element => element.textContent, element2);
            return code
            
        } catch (err) {
            return "Code Not Sent"
            
        }

    }
    
};
