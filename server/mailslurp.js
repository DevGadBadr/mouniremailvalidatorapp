import { MailSlurp } from 'mailslurp-client';

const mailslurp = new MailSlurp({ apiKey: "f522ab5987ce6fee40d94c383cdccb3dc3c0a43c76858748bef39baeb102e534" });
// const inbox = await mailslurp.inboxController.createInboxWithDefaults();
export async function getExistingInboxes() {
    var emailsList = [];
    try {
        // Fetch the list of inboxes
        const inboxes = await mailslurp.getInboxes();
        
        // Display the list of inbox IDs and email addresses
        inboxes.forEach(inbox => {
            var id = inbox.id;
            var email = inbox.emailAddress;
            emailsList.push({id:id,email:email})
        });
        
        return emailsList;
    } catch (error) {
        console.error('Error fetching inboxes:', error);
    };
};

export async function waitForEmailAndExtractCode(inboxId) {
    try {
        // Wait for the latest email in the inbox (up to 60 seconds)
        const email = await mailslurp.waitForLatestEmail(inboxId, 60000,true);
        const linesResult = await mailslurp.emailController.getEmailTextLines({
            emailId: email.id,
            decodeHtmlEntities: true,
          });

        const code = linesResult.lines[3].slice(15,)
        console.log(code)

        // Mark the email as read
        await mailslurp.emailController.markAsRead({emailId:email.id,read:true})

        return code;
    } catch (error) {
        console.error('Error while waiting for or processing the email:', error);
    }
};

const emails = await getExistingInboxes();
console.log(emails.length)