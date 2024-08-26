const uploadButton = document.getElementById('uploadButton');
const mainBody = document.getElementById('mainBody');
const uploadLabel = document.getElementById('uploadLabel');
const uploadLabel2 = document.getElementById('uploadLabel2');
const startButton = document.getElementById('startButton');
const getCodeButton = document.getElementById('getCodeButton');


uploadButton.addEventListener('click',()=>{
     // Create an input element to select files
     const fileInput = document.createElement('input');
     fileInput.type = 'file';
     fileInput.accept = '.txt';

     fileInput.addEventListener('change', () => {
         const file = fileInput.files[0];

         if (file) {
             const formData = new FormData();
             formData.append('file', file);

             fetch('/validatorapp/upload', {
                 method: 'POST',
                 body: formData,
             })
             .then(response => response.json())
             .then(data => {
                if (data.success) {

                    creatNodes(data.fileName);
                    uploadLabel.innerText = 'Loaded File ' + data.fileName;
                    uploadLabel2.innerText = 'Loaded File ' + data.fileName;
                    startButton.classList.remove('hidden');
                    getCodeButton.classList.remove('hidden');

                    fetch('/validatorapp/resetCount')
                    .then(response=> response.json())
                    .then(data=>{

                    })
                 } else {
                     alert('File upload failed!');
                     startButton.classList.add('hidden');
                 }
             })
             .catch(error => {
                 console.error('Error:', error);
                 alert('File upload failed!');
             });
         }
     });

     // Trigger the file input dialog
     fileInput.click();    
});

async function creatNodes(fileName,callback){
    fetch('./files/' + fileName)
    .then(response => response.text())
    .then(data =>{
        try{
            var emails = [];
            var passes = [];
            var dataarray = data.split('\r');
            dataarray.forEach(item=>{
                emails.push(item.split(',')[0].replace('\n',''));
                passes.push(item.split(',')[1].replace('\n',''));
            })
 
            var h4s = mainBody.querySelectorAll('h4')

            if (h4s.length !==0){
                var index = parseInt(h4s[h4s.length-2].innerText)
            } else{
                var index = 0;
            }
            var exisingEmails = [];

            h4s.forEach(h4=>{

                if (h4.innerText.includes('@')){
                    exisingEmails.push(h4.innerText)
                }

            });
            emails.forEach(email=>{
                if (!exisingEmails.includes(email)){
                    var password = passes[index];
                    createAndAppendNode(mainBody,email,index,password);
                    index=index+1;
                }
            })
        } catch(e){
            console.log('Invalid file');
            console.log(e);
            startButton.classList.add('hidden');
            uploadLabel.innerText = 'Invalid File';
            uploadLabel2.innerText = 'Invalid File' ;
        }
    })
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};


function findTargetElement(parentClass, targetClass, text, siblingClass) {
    // Select all elements with the parent class
    const parentElements = document.querySelectorAll(`.${parentClass}`);

    for (let parentElement of parentElements) {
        // Find the target element with the specific class and text within the parent
        const targetElement = parentElement.querySelector(`.${targetClass}`);
        
        if (targetElement && targetElement.textContent.includes(text)) {
            // Find the sibling with the specific class within the same parent
            const siblingElement = parentElement.querySelector(`.${siblingClass}`);
            return siblingElement;
        }
    }

    return null; // Return null if no match is found
};

// Web Socket For Progress
const socket = new WebSocket('wss://devgadbadr.com:9090');

socket.onopen = () => {
    console.log('Connected to WebSocket server on port 9090');
};

socket.onmessage = (event) => {
    
    const data = JSON.parse(event.data);

    var email = data[2];
    var progValue = data[1];
    var message = data[0];

    var targetBar = findTargetElement('emailnode','emailname',email,'progress');
    var targetValue = findTargetElement('emailnode','emailname',email,'progressValue');
    var targetTextbox = findTargetElement('emailnode','emailname',email,'textbox');

    if (message=='Error'){

        targetTextbox.innerText = 'Error Happened, Try again later';

    } else{

        targetTextbox.innerText = message;
        targetBar.style.width = `${progValue}%`;
        targetValue.innerText = `${progValue}%`

    }


};

socket.onclose = () => {
    console.log('WebSocket connection closed');
};


startButton.addEventListener('click', async ()=>{

    let count = 0;
    fetch('./doneCount.json')
    .then(response=> response.json())
    .then(data=>{
        if (data.doneCount===0){

        } else{
            count = data.doneCount
        }
    })

    // Getting All Emails in the Box
    var presentNodes = mainBody.querySelectorAll('.emailnode');
    var presentNodesArray = Array.from(presentNodes)
    var presentNodesArrayLeft = presentNodesArray.slice(count,)
    async function makeFetchActivation() {
        const chunkSize = 20;
        
        // Split the array into chunks of 20 items
        for (let i = 0; i < 1; i += chunkSize) {
            const chunk = presentNodesArrayLeft.slice(0,1)
            
            // Process each chunk
            await Promise.all(chunk.map(async (node) => {
                const data = {
                    email: node.querySelector('.emailname').innerText,
                    password: node.querySelector('.passwordbox').value,
                    index:i
                };
                try {
                    const response = await fetch('/validatorapp/activate', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(data)
                    });
                    
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
    
                    const result = await response.text();
    
                    // Handle the response for the specific node
                    const imgElement = node.querySelector('img.doneIcon');
                    const nodeProgress = node.querySelector('.progress');
                    const nodeProgressVal = node.querySelector('.progressValue');
    
                    if (result !== 'Error') {
                        imgElement.src = 'correct.svg';
                        nodeProgress.style.width = '100%';
                        nodeProgressVal.innerText = '100%';
                        const email = result.split(',')[0];
                        const targetTextbox = findTargetElement('emailnode', 'emailname', email, 'textbox');
                        const code = result.split(',')[1];
                        if(typeof(code)=='undefined'){
                            targetTextbox.innerText = "Try Pressing Get Code Button Later";
                        }else{
                            targetTextbox.innerText = "Amazon Code: " + code;
                        }
                        
                    }
                    updateCount(1);
                } catch (error) {
                    console.error('Fetch activation failed:', error);
                }
            }));
        };
    };
    makeFetchActivation();    

});

async function updateCount(value){

    fetch('./doneCount.json')
    .then(response => response.json())
    .then(data=>{
        var newValue = data.doneCount + value
        fetch('/validatorapp/updateCount',{method:'POST',headers: {'Content-Type': 'application/json'},body:JSON.stringify({value:newValue})})
        .then(response=> response.json() )
        .then(data=>{
            // console.log('Count Increased By '+ value + ' ' + data.message)
        })
    })

};

getCodeButton.addEventListener('click', async ()=>{
    
    // Getting All Emails in the Box
    var presentNodes = mainBody.querySelectorAll('.emailnode');
    var presentNodesArray = Array.from(presentNodes)

    async function makeFetchActivation() {
        const chunkSize = 20;
        
        // Split the array into chunks of 20 items
        for (let i = 0; i < 1; i += chunkSize) {

            const chunk = presentNodesArray.slice(0,1)
            // Process each chunk
            await Promise.all(chunk.map(async (node) => {
                const data = {
                    email: node.querySelector('.emailname').innerText,
                    password: node.querySelector('.passwordbox').value,
                };
                var email = node.querySelector('.emailname').innerText;
                const targetTextbox = findTargetElement('emailnode', 'emailname', email, 'textbox');
                targetTextbox.innerText = "Getting Code...";
                try {
                    const response = await fetch('/validatorapp/getCode', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(data)
                    });
                    
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
    
                    const result = await response.text();
    
                    // Handle the response for the specific node
                    const imgElement = node.querySelector('img.doneIcon');
                    const nodeProgress = node.querySelector('.progress');
                    const nodeProgressVal = node.querySelector('.progressValue');
    
                    if (result !== 'Error') {
                        imgElement.src = 'correct.svg';
                        nodeProgress.style.width = '100%';
                        nodeProgressVal.innerText = '100%';
                        const targetTextbox = findTargetElement('emailnode', 'emailname', email, 'textbox');
                        targetTextbox.innerText = "Amazon Code: " + result;
                    } else{
                        const targetTextbox = findTargetElement('emailnode', 'emailname', email, 'textbox');
                        targetTextbox.innerText = "Login Failed, Try Validate First";
                    }
                 
                } catch (error) {
                    console.error('Fetch activation failed:', error);
                }
            }));
        };
    };
    makeFetchActivation();
});

async function makeProgress(bar,value){
    for(let i=1;i<101;i++){
        bar.style.width = `${i}%`;
        value.innerText = `${i}%`;
        await sleep(1000)
    };
};

function createAndAppendNode(targetElement, email, index , password) {
    // Create the outer div with class "emailnode"
    const emailNode = document.createElement('div');
    emailNode.className = 'emailnode';

    // Create the inner elements
    const emailNumber = document.createElement('h4');
    emailNumber.className = 'emailnumber label';
    emailNumber.textContent = index + 1; // Use the index to set the email number

    const emailName = document.createElement('h4');
    emailName.className = 'emailname label';
    emailName.textContent = email;

    const passwordBox = document.createElement('input');
    passwordBox.type = 'text';
    passwordBox.className = 'passwordbox';
    passwordBox.value = password;
    

    const progressBar = document.createElement('div');
    progressBar.className = 'progressbar';

    const progress = document.createElement('div');
    progress.className = 'progress';

    progressBar.appendChild(progress);

    const progressValue = document.createElement('div');
    progressValue.className = 'progressValue';
    progressValue.textContent = '0%';

    const doneIcon = document.createElement('div');
    doneIcon.className = 'doneIcon';
    doneIcon.id = 'doneIcon';

    const doneIconImg = document.createElement('img');
    doneIconImg.src = 'notactive.svg';
    doneIconImg.alt = '';
    doneIconImg.className = 'doneIcon';

    doneIcon.appendChild(doneIconImg);

    const space = document.createElement('div');
    space.className = 'space textbox';

    const removeEmail = document.createElement('img');
    removeEmail.src = 'remove.svg';
    removeEmail.alt = '';
    removeEmail.id = 'removeEmail';
    removeEmail.className = 'doneIcon';
    removeEmail.addEventListener('click', () => {
        targetElement.removeChild(emailNode);
    });

    // Append all inner elements to the outer div
    emailNode.appendChild(emailNumber);
    emailNode.appendChild(emailName);
    emailNode.appendChild(passwordBox);
    emailNode.appendChild(progressBar);
    emailNode.appendChild(progressValue);
    emailNode.appendChild(doneIcon);
    emailNode.appendChild(space);
    emailNode.appendChild(removeEmail);

    // Append the outer div to the target element
    targetElement.appendChild(emailNode);
};