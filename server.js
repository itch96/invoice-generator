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
                    let listingIdsArray = [];
                    let quantitiesArray = [];
                    let output = '';
                    pdfParser.parseBuffer(pdfBuffer);
                    pdfParser.on("pdfParser_dataReady", pdfData => {
                        let pagesArray = pdfData.formImage.Pages;
                        for (let i = 0; i < pagesArray.length; i++) {
                            let texts = pagesArray[i].Texts;
                            for (let j = 0; j < texts.length; j++) {
                                let myChar = texts[j].R[0].T.replace(/%20/g, '').replace(/%3A/g, ':');
                                output += myChar;
                            }
                        }
                        listingIdsArray = output.match(/LSTAC.{20}SKU/g);
                        quantitiesArray = output.match(/EBT[0-9]{3}[0-9]+/g);


                        for (let i = 0; i < listingIdsArray.length; i++) {
                            listingIdsArray[i] = listingIdsArray[i].slice(0, listingIdsArray.length - 1);
                            let quantitiesLength = i == quantitiesArray.length - 1 ? quantitiesArray[i].length : quantitiesArray[i].length - (i + 2).toString().length
                            quantitiesArray[i] = quantitiesArray[i].slice(6, quantitiesLength);
                        }
                        console.log(listingIdsArray)
                        console.log(quantitiesArray)
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