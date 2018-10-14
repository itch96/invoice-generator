'use strict'

const express = require('express');
const app = express();
const fileUpload = require('express-fileupload');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const PDFParser = require("pdf2json");
const pdfParser = new PDFParser();
const ejs = require('ejs');
const ejsMate = require('ejs-mate');
const fs = require('fs');
const path = require('path');

const config = require('./config/config.js');

app.use(morgan('dev'));
app.use(fileUpload());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');


app.get('/', (request, response) => {
    response.render('global/index');
});

app.post('/upload', (request, response) => {
    console.log(request.files.pdf.name);
    const folderPath = path.join(__dirname, 'invoiceGenerator');
    const filePath = path.join(__dirname, 'invoiceGenerator', 'picklist.pdf');

    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    request.files.pdf.mv(filePath)
        .then(() => {
            console.log("FILE MOVED");
            fs.readFile(filePath, (err, pdfBuffer) => {
                if (!err) {
                    let output = '';
                    pdfParser.parseBuffer(pdfBuffer);
                    pdfParser.on("pdfParser_dataReady", pdfData => {
                        let pagesArray = pdfData.formImage.Pages;
                        for (let i = 0; i < pagesArray.length; i++) {
                            let texts = pagesArray[i].Texts;
                            for (let j = 0; j < texts.length; j++) {
                                let myChar = texts[j].R[0].T.trim().replace(/%20/g, '').replace(/%3A/g, ':');
                                output += myChar;
                            }
                        }
                        console.log(output);
                    });
                }
            });
        }).catch(err => {
            console.log(err);
        }).finally(() => {
            response.redirect('/');
        });
});

app.listen(config.PORT, err => {
    if (err) {
        console.log(err);
    }
    console.log(`App running on port ${config.PORT}`);
});