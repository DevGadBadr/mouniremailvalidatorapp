import * as fs from 'fs/promises';
import * as path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify']; // Change the scope to allow modifying the messages
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.labels.list({
    userId: 'me',
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log('No labels found.');
    return;
  }
  console.log('Searching For Emails');
  labels.forEach((label) => {
    // console.log(`- ${label.name}`);
  });
}

authorize().then(listLabels).catch(console.error);

// Function to wait for an email with a specific subject
async function waitForEmail(auth, subject) {
  const gmail = google.gmail({ version: 'v1', auth });

  while (true) {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `subject:${subject} is:unread`, // Filter emails by subject
      maxResults: 1,
    });

    const messages = res.data.messages;
    if (messages && messages.length > 0) {
      const message = messages[0];

      // Get the full message details
      const messageData = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      // console.log('Email received:', messageData.data.snippet);

      // After processing the email, mark it as read
      await markEmailAsRead(gmail, message.id);

      return messageData.data.snippet;
    }

    // Wait for some time before checking again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// Function to mark the email as read
async function markEmailAsRead(gmail, messageId) {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD'], // This removes the UNREAD label, effectively marking the email as read
    },
  });

  console.log(`Message ${messageId} marked as read.`);
}

// Example usage
export async function checkForSecurityCodeEmail() {
  const auth = await authorize(); // Assume authorize() is a function that returns an authenticated OAuth2 client
  const subject = 'Microsoft account security code';
  const email = await waitForEmail(auth, subject);
  const regex = /\b\d{6}\b/;
  const match = email.match(regex);
  // console.log('Security code email received:', match[0]);
  return match[0];
}

// Run the function
// checkForSecurityCodeEmail();
