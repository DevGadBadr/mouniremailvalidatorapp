import express from "express";
import bodyParser from "body-parser";
import env from 'dotenv'
import GoogleStrategy  from 'passport-google-oauth2'
import path from 'path';
import multer from 'multer';
import {activateEmail} from './automationScript.js'
import {setupWebSocketServer} from './automationScript.js'
import { createServer } from 'http';
import fs from 'fs';
import { getCode } from "./gettingCode.js";
import https from'https';
import http from'http';

env.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('../client'));
app.use(express.static("public"));
const port = 3000;

// SSL Part
const privateKey = fs.readFileSync('../../../SSL/devgadbadr.com_key.txt','utf-8');
const certificate = fs.readFileSync('../../../SSL/devgadbadr.com.crt','utf-8');
const ca = fs.readFileSync('../../../SSL/devgadbadr.com.ca-bundle','utf-8');
const credentails = {key:privateKey,cert:certificate,ca:ca};
const httpsServer = https.createServer(credentails,app);
const httpApp = express();
httpApp.use((req,res)=>{
    res.redirect(`https://${req.hostname}${req.url}`);
})


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '../client/files');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    res.json({ success: true , fileName:req.file.originalname });
  } else {
    res.json({ success: false });
  }
});

app.get('/',(req,res) => {
  res.redirect('/validatorapp/home');
});

app.get('/home',(req,res) => {
    res.render('index.ejs');
  });


app.post('/activate',async (req,res)=>{

  var email =  req.body.email;
  var password = req.body.password;
  var emailIndex = req.body.index
  var successEmail = await activateEmail(email,password,emailIndex);
  res.send(successEmail);
  // res.sendStatus(204);
  
});

app.get('/resetCount',(req,res)=>{
  fs.writeFile('../client/doneCount.json', JSON.stringify({doneCount:0}, null, 2), (err) => {
    if (err) {
        console.error('Error writing file', err);
    } else {
        // console.log('Count Reseted');
    }
  });
  res.json({message:'Success'});
});

app.post('/updateCount',(req,res)=>{

  var value = req.body.value

  fs.readFile('../client/doneCount.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file', err);
      res.status(500).json({ message: 'Error reading file' });
      return;
    }

    const jsonData = JSON.parse(data);
    jsonData.doneCount = value;

    fs.writeFile('../client/doneCount.json', JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing file', err);
        res.status(500).json({ message: 'Error writing file' });
      } else {
        res.json({ message: 'Success' });
      }
    });
  });
});


app.post('/stop',(req,res)=>{
  var stopflag = req.body.stopflag
  fs.readFile('../client/doneCount.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file', err);
      res.status(500).json({ message: 'Error reading file' });
      return;
    }

    const jsonData = JSON.parse(data);
    jsonData.stopflag = stopflag;

    fs.writeFile('../client/doneCount.json', JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing file', err);
        res.status(500).json({ message: 'Error writing file' });
      } else {
        res.json({ message: 'Success' });
      }
    });
  });
});

app.post('/getCode',async (req,res)=>{
  var email =  req.body.email;
  var password = req.body.password;
  try{
    var receivedCode = await getCode(email,password);
    console.log('Received Code is: '+receivedCode)
    res.send(receivedCode);
  }
  catch(err){

    res.send('Error');
  }


});

setupWebSocketServer();

httpsServer.listen(port,()=>{console.log('App Started On Port ' + port)});