import puppeteer from 'puppeteer'
// import {checkForSecurityCodeEmail} from './mail.js'
import { WebSocketServer } from 'ws';
import json from 'body-parser/lib/types/json.js';
import {waitForEmailAndExtractCode,getExistingInboxes} from './mailslurp.js'
import { getCode } from './gettingCode.js';
import pg from "pg";
import env from 'dotenv'

env.config();
// Connect to the PostgreSQL server
const { Client } = pg;
const db = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST, 
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432, 
});

db.connect()
  .then(() => {
    console.log('Connected to PostgreSQL database');
    return db.query('SELECT NOW()');
  })
  .then((res) => {
    console.log('Server time:', res.rows[0]);
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL database:', err.stack);
  });



let wsocket = null;

export function setupWebSocketServer() {
    const wss = new WebSocketServer({ port: 8080 });

    wss.on('connection', ws => {
       
        wsocket = ws;
        ws.on('close', () => {
           
        });
    });

    console.log('WebSocket server is on Port 8080');
};


export async function activateEmail(email,password,index) {

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    wsocket.send(JSON.stringify(['Activation Started',5,email]));

    // try {

        const outlookurl = 'https://login.microsoftonline.com/common/oauth2/authorize?client_id=00000002-0000-0ff1-ce00-000000000000&redirect_uri=https%3a%2f%2foutlook.office.com%2fowa%2f&resource=00000002-0000-0ff1-ce00-000000000000&response_mode=form_post&response_type=code+id_token&scope=openid&nonce=638588142621943172.33eb34ef-58b5-4156-a19a-635d3c254ead&msaredir=1&client-request-id=d489c4ae-b3c3-c5a0-dbbf-f49e03091477&protectedtoken=true&claims=%7b%22id_token%22%3a%7b%22xms_cc%22%3a%7b%22values%22%3a%5b%22CP1%22%5d%7d%7d%7d&prompt=select_account&state=DYu7DoIwAACL_gtbhT5pB-JgYhhwURMNi-nLREItKRXj39vhbrlcAQDYZjaZos4CDSeCCYEo5hhJSlCDd4Q4Tah7QiY0gxQxDhWSCnLCLDGYUadskd-hCl9V7ecY_JzaxU3OpIcyJnzeqVySSq5FZXT2FXO4hlZ159p0J97_5Grv50VjGXsv_eCncbiwUeN61bfjrA_iDw';
        await page.goto(outlookurl, { waitUntil: 'load' ,timeout:120000});
    
        wsocket.send(JSON.stringify(['Opened Outlook',10,email]));
    
        // Type Email
        await page.waitForSelector('input[name="loginfmt"]');
        await page.type('input[name="loginfmt"]', email);
    
        wsocket.send(JSON.stringify(['Entering Email',15,email]));
        // Click Next
        await page.waitForSelector('#idSIButton9');
        await page.click('#idSIButton9');
    
        wsocket.send(JSON.stringify(['Pressing Next',20,email]));
    
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        if(page.url().includes('login')){
            
        }    
    
        // Type Password
        await page.waitForSelector('input[placeholder="Password"]');
        await page.type('input[placeholder="Password"]', password);
    
        wsocket.send(JSON.stringify(['Clicking Sign In',25,email]));
    
        // Click Sign In
        await page.waitForSelector('#idSIButton9');
        await page.click('#idSIButton9');
    
    
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
        // Case Email Needs activation
        if(page.url().includes('proofs')){

            var currentInboxes = await getExistingInboxes();

            var activationEmail = currentInboxes[index].email
            var activationemailID = currentInboxes[index].id

            // Enter Activation Email
            await page.waitForSelector('#EmailAddress');
            await page.type('#EmailAddress', activationEmail);
    
            wsocket.send(JSON.stringify(['Email Needs Validation Processing',30,email]));

            const dbinsertResponse = await db.query('INSERT INTO emails (email,password,validationemail,validationemailid) VALUES ($1,$2,$3,$4)',[email,password,activationEmail,activationemailID]);
            console.log('DB Insert Response Is: '+ dbinsertResponse)

            // Click Next
            await page.waitForSelector('#iNext');
            await page.click('#iNext');
    
            wsocket.send(JSON.stringify(['Waiting Code...',35,email]));

            var code = await waitForEmailAndExtractCode(activationemailID);
            console.log(code)
    
            wsocket.send(JSON.stringify(['Code Recieved',40,email]));
            
            // Enter Verification Code
            await page.waitForSelector('#iOttText');
            await page.type('#iOttText', code);
    
            wsocket.send(JSON.stringify(['Going On With Activation',45,email]));
    
            // Click Next
            await page.waitForSelector('#iNext');
            await page.click('#iNext');
    
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
            if(page.url().includes('identity/confirm')){
                const spanElement = await page.$x("//span[contains(text(), 'Email ga*****@gmail.com')]");
                await spanElement[0].click();
            } else if(page.url().includes('login')){
    
                // Click Yes
                await page.waitForSelector('#acceptButton');
                await page.click('#acceptButton');
    
                wsocket.send(JSON.stringify(['Account Activated Openeing Outlook',80,email]))
        
                await page.waitForNavigation({ waitUntil: 'load' });
        
                await page.waitForSelector('span[class="flexContainer-158"]');

                wsocket.send(JSON.stringify(['Account is Ready',90,email]))
            
                if(page.url().includes('outlook.live.com/mail/0/')){
                    
                    (async () => {
                        try {
                            const code = await getCode(email, password);
                            console.log(code); // Logs the code
                        } catch (error) {
                            console.error('Error:', error);
                        }
                    })();
                    // await browser.close();
                    return `${email},${code}`;
                    
                }
            };
    
    
        // Case Email is Ready
        } else if(page.url().includes('ppsecure')){
    
            // Click Yes
            await page.waitForSelector('#acceptButton');
            await page.click('#acceptButton');
    
            wsocket.send(JSON.stringify(['Account is Activated',80,email]));
    
            await page.waitForNavigation({ waitUntil: 'load' });
    
            await page.waitForSelector('span[class="flexContainer-158"]');

            wsocket.send(JSON.stringify(['Account is Ready',90,email]))
        
            if(page.url().includes('outlook.live.com/mail/0/')){

                try{

                    const frame = await page.waitForSelector('::-p-xpath(//*[@id="unified_consent_dialog_frame"])');
                    const frameContent = await frame.contentFrame();
                    const divHandle = await frameContent.waitForSelector('::-p-xpath(//*[@id="contentContainer"]/div[2])');


                    if (divHandle) {
                        console.log('Div element found!');
                        
                        const divSelector = '#ParentContentContainer';
                        await frameContent.waitForSelector(divSelector);
                        await frameContent.evaluate(() => {
                            const div = document.getElementById('ParentContentContainer');
                            div.scrollTop = div.scrollHeight;
                        });
                        
                        // Click Ok
                        await frameContent.waitForSelector('#unified-consent-continue-button');
                        await frameContent.waitForFunction(selector => {
                            const button = document.querySelector(selector);
                            return button && !button.disabled;
                        }, {}, '#unified-consent-continue-button');
                        await frameContent.click('#unified-consent-continue-button');

                    } else {
                        console.log('Div element not found!');
                    }
                } catch(err){
                    console.log('Consent didn"t Show: ' + err)
                }

                
                try {
                    const code = await getCode(email, password);
                    console.log(code); // Logs the code
                    return `${email},${code}`;
                } catch (error) {
                    console.error('Error:', error);
                }
                // await browser.close();
                
            }
            
    
        // Case Email needs code from existing email
        } else if(page.url().includes('identity/confirm')){

            var currentInboxes = await getExistingInboxes();
    
            wsocket.send(JSON.stringify(['Need Code From Added Email, Sending',30,email]));

            await page.waitForSelector('#iProofLbl0');
            await page.click('#iProofLbl0');

            
            await page.waitForSelector('#iEnterProofDesc');
            const text = await page.$eval('#iEnterProofDesc',ele => ele.textContent);
            console.log(text)

            // Case Hidden Part
            if(text.includes('hidden part')){

            };
            return

            // 
    
            const emaipart = 'gadelhaq271';
            await page.waitForSelector('#iProofEmail');
            await page.type('#iProofEmail', emaipart);

            wsocket.send(JSON.stringify(['Email Choosen Moving On',33,email]));

            await page.waitForSelector('#iSelectProofAction');
            await page.click('#iSelectProofAction');

            wsocket.send(JSON.stringify(['waiting Code...',35,email]));
            
            // var code = await checkForSecurityCodeEmail();
            console.log(code);

            wsocket.send(JSON.stringify(['Code Recieved',50,email]));

            // Enter Verification Code
            await page.waitForSelector('#iOttText');
            await page.type('#iOttText', code);

            wsocket.send(JSON.stringify(['Entering Code',60,email]));

            await page.waitForSelector('#iVerifyCodeAction');
            await page.click('#iVerifyCodeAction');
            
            await page.waitForSelector('#acceptButton');
            await page.click('#acceptButton');

            wsocket.send(JSON.stringify(['Account is activated',80,email]));

            await page.waitForSelector('span[class="flexContainer-158"]');
    
            if(page.url().includes('outlook.live.com/mail/0/')){
                await browser.close();
                return `${email}`;
            }}
        
    // } catch (error) {

    //     // console.log('error')
    //     try{
    //         const date = new Date();
    //         var filename = 'error-' + date + '.jpg';
    //         await page.screenshot({ path: filename, fullPage: true });
    //     } catch(err){
    //         // console.log(err)
    //     }

    //     wsocket.send(JSON.stringify(['Error',0,email]))
    //     return 'Error';
    // }
};