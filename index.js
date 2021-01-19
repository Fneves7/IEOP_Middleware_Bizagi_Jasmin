const fs = require('fs');
const express = require("express");
const request = require('request');
const readline = require('readline');
const {google} = require('googleapis');
const moment = require('moment');
const app = express();
const PORT = 3000;
//Primavera Jasmin
//Subscription
const user = '246568';
const subscription = '246568-0001';
//App
const appname = 'IEOP2021';
const secret = '8fc6bbb6-3da0-4e57-8d11-aaefd1e4db6f';
//URL API Jasmin
const PRIMAVERA_BASE_URL = `https://my.jasminsoftware.com/api/${user}/${subscription}`;
//Google calendar
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const GOOGLE_REPAIRS_CALENDAR = 'pte14c0njg915aq8hdbqi1lm98@group.calendar.google.com';
const GOOGLE_TOKEN_PATH = 'token.json';
let googleOAuth2Client;

//Server
app.use(express.json());
app.use(express.urlencoded({extended: true}));

//Rota primária - Indicar que a api está a funcionar
app.get("/", function (req, res) {
    res.status(200).json({
        status: true,
        message: "Sucess"
    })
})

//METHOD:GET->Google calendar
app.get('/pickupAvailability', (req, res) => {
    if (dateString = req.query.datetime) {
        // TODO Check if strict mode can be used for the date
        const momentdate = moment(dateString, "MM/DD/YYYY hh:mm:ss A");
        const startStamp = momentdate.format("YYYY-MM-DDTHH:mm:ssZ");
        const finishStamp = momentdate.add(1, 'hours').format("YYYY-MM-DDTHH:mm:ssZ");

        getCalendarData(startStamp, finishStamp).then((data) => {
            const calLength = data.calendars[GOOGLE_REPAIRS_CALENDAR].busy.length;
            if (calLength) {
                res.status(200).json({
                    available: false
                })
            } else {
                res.status(200).json({
                    available: true
                })
            }
        }).catch((err) => {
            res.status(500).json({
                status: false,
                message: "The query to the Calendar API failed"
            });
        });
    } else {
        res.status(400).json({
            status: false,
            message: "The endpoint requires a date query param to verify availability"
        });
    }
});

//METHOD:GET->GETSTOCK
app.get("/get_stock", function (requesto, resposta) {
    if (typeof requesto.body.itemKey === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "itemKey inválido"
        });
        return;
    }
    var itemKey = requesto.body.itemKey;

    //Pedir um acces token
    request({
        url: 'https://identity.primaverabss.com/core/connect/token',
        method: 'POST',
        auth: {
            user: appname, // TODO : put your application client id here
            pass: secret // TODO : put your application client secret here
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'application',
        }
    }, function (err, res) {
        if (res) {
            var json = JSON.parse(res.body);
            var access_token = json.access_token;
            var url = `${PRIMAVERA_BASE_URL}/materialscore/materialsItems/` + itemKey + `/extension`;

            request({
                    url: url,
                    method: "GET",
                    headers: {
                        "Authorization": `bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    },
                    form: {
                        scope: 'application'
                    }
                },
                function (err, res) {
                    if (err) {
                        resposta.status(400).json({
                            status: false,
                            message: "Inserir itemKey"
                        });
                        return;
                    }
                    var json = JSON.parse(res.body);
                    var wharehouse = json.materialsItemWarehouses
                    if (json) {
                        //foreach dos armazéns
                        json.materialsItemWarehouses.forEach(element => {
                            if (element.stockBalance > 0) {
                                resposta.status(200).json({
                                    status: true,
                                    message: {"Armazém": element.warehouse, "Stock": element.stockBalance}
                                });
                            }/*else{
								resposta.status(200).json({
									status: true,
									//message: {"Armazém": element.warehouse, "Stock": element.stockBalance}
								});
							}*/
                        });
                    } else {
                        resposta.status(404).json({
                            status: false,
                            message: "Inexistente"
                        });
                    }
                });
        } else {
            resposta.status(400).json({
                status: false,
                message: "Ocorreu um erro ao fazer o pedido de autenticação"
            });
            return;
        }
    });
})

//METHOD:POST->CREATEBUDGET
app.post("/create_budget", function (requesto, resposta) {
    // Validacoes nos pedidos
    if (typeof requesto.body.salesItem === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "salesItem inválido: " + requesto.body.salesItem
        });
        return;
    }
    if (typeof requesto.body.buyerCustomerParty === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "buyerCustomerParty inválido: " + requesto.body.buyerCustomerParty
        });
        return;
    }
    if (typeof requesto.body.emailTo === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "emailTo inválido: " + requesto.body.emailTo
        });
        return;
    }

    var salesItem = requesto.body.salesItem;
    var buyerCustomerParty = requesto.body.buyerCustomerParty;
    var emailTo = requesto.body.emailTo;
    //data e converter para rfc3339
    var dateTime = new Date();
    var dateTimeFormatted = dateTime.toISOString();

    //Pedir um acces token
    request({
        url: 'https://identity.primaverabss.com/core/connect/token',
        method: 'POST',
        auth: {
            user: appname, // TODO : put your application client id here
            pass: secret // TODO : put your application client secret here
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'application',
        }
    }, function (err, res) {
        if (res) {
            var json = JSON.parse(res.body);
            var access_token = json.access_token;
            var url = `${PRIMAVERA_BASE_URL}/sales/quotations`;
            var body = {
                "company": "REPAIRMASTERS",
                "emailTo": emailTo,
                "buyerCustomerParty": buyerCustomerParty,
                "documentDate": dateTimeFormatted,
                "documentLines": [
                    {"salesItem": salesItem}]
            };
            request({
                    url: url,
                    method: "POST",
                    headers: {
                        "Authorization": `bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    },
                    json: true,
                    body: body
                },
                function (err, res, body) {
                    if (err) {
                        resposta.status(400).json({
                            status: false,
                            message: "Dados inválidos"
                        });
                        return;
                    }

                    if (body) {
                        resposta.status(201).json({
                            status: true,
                            message: body
                        });
                    } else {
                        resposta.status(400).json({
                            status: false,
                            message: "Bad Request"
                        });
                    }
                });
        } else {
            resposta.status(400).json({
                status: false,
                message: "Ocorreu um erro ao fazer o pedido de autenticação"
            });
            return;
        }
    });
})

//METHOD:POST CREATEINVOICE
app.post("/create_invoice", function (requesto, resposta) {
    // Validacoes nos pedidos
    if (typeof requesto.body.salesItem === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "salesItem inválido: " + requesto.body.salesItem
        });
        return;
    }
    if (typeof requesto.body.buyerCustomerParty === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "buyerCustomerParty inválido: " + requesto.body.buyerCustomerParty
        });
        return;
    }
    if (typeof requesto.body.emailTo === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "emailTo inválido: " + requesto.body.emailTo
        });
        return;
    }

    var salesItem = requesto.body.salesItem;
    var buyerCustomerParty = requesto.body.buyerCustomerParty;
    var emailTo = requesto.body.emailTo;
    //data e converter para rfc3339
    var dateTime = new Date();
    var dateTimeFormatted = dateTime.toISOString();

    //Pedir um acces token
    request({
        url: 'https://identity.primaverabss.com/core/connect/token',
        method: 'POST',
        auth: {
            user: appname, // TODO : put your application client id here
            pass: secret // TODO : put your application client secret here
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'application',
        }
    }, function (err, res) {
        if (res) {
            var json = JSON.parse(res.body);
            var access_token = json.access_token;
            var url = `${PRIMAVERA_BASE_URL}/billing/invoices`;
            var body = {
                "company": "REPAIRMASTERS",
                "documentType": "FA",
                "buyerCustomerParty": buyerCustomerParty,
                "emailTo": emailTo,
                "documentDate": dateTimeFormatted,
                "documentLines": [{"salesItem": salesItem}]
            };
            request({
                    url: url,
                    method: "POST",
                    headers: {
                        "Authorization": `bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    },
                    json: true,
                    body: body
                },
                function (err, res, body) {
                    if (err) {
                        resposta.status(400).json({
                            status: false,
                            message: "Dados inválidos"
                        });
                        return;
                    }

                    if (body) {
                        resposta.status(201).json({
                            status: true,
                            message: body
                        });
                    } else {
                        resposta.status(400).json({
                            status: false,
                            message: "Bad Request"
                        });
                    }
                });
        } else {
            resposta.status(400).json({
                status: false,
                message: "Ocorreu um erro ao fazer o pedido de autenticação"
            });
            return;
        }
    });
})

//METHOD:POST CREATEORDER
app.post("/create_order", function (requesto, resposta) {
    // Validacoes nos pedidos
    if (typeof requesto.body.salesItem === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "salesItem inválido: " + requesto.body.salesItem
        });
        return;
    }
    if (typeof requesto.body.buyerCustomerParty === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "buyerCustomerParty inválido: " + requesto.body.buyerCustomerParty
        });
        return;
    }
    if (typeof requesto.body.emailTo === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "emailTo inválido: " + requesto.body.emailTo
        });
        return;
    }

    var salesItem = requesto.body.salesItem;
    var buyerCustomerParty = requesto.body.buyerCustomerParty;
    var emailTo = requesto.body.emailTo;
    //data e converter para rfc3339
    var dateTime = new Date();
    var dateTimeFormatted = dateTime.toISOString();

    //Pedir um acces token
    request({
        url: 'https://identity.primaverabss.com/core/connect/token',
        method: 'POST',
        auth: {
            user: appname, // TODO : put your application client id here
            pass: secret // TODO : put your application client secret here
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'application',
        }
    }, function (err, res) {
        if (res) {
            var json = JSON.parse(res.body);
            var access_token = json.access_token;
            var url = `${PRIMAVERA_BASE_URL}/sales/orders`;
            var body = {
                "company": "REPAIRMASTERS",
                "documentType": "ECL",
                "buyerCustomerParty": buyerCustomerParty,
                "emailTo": emailTo,
                "documentDate": dateTimeFormatted,
                "documentLines": [{"salesItem": salesItem}]
            };
            //dados estáticos
            /*var body = {
                "company": "REPAIRMASTERS",
                "documentType": "ECL",
                "buyerCustomerParty": "0003",
                "emailTo": "fneves@ipvc.pt",
                "documentDate": dateTimeFormatted,
                "documentLines": [
                    {"salesItem": "A07"},
                    {"salesItem": "A03"}]
            };*/
            request({
                    url: url,
                    method: "POST",
                    headers: {
                        "Authorization": `bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    },
                    json: true,
                    body: body
                },
                function (err, res, body) {
                    if (err) {
                        resposta.status(400).json({
                            status: false,
                            message: "Dados inválidos"
                        });
                        return;
                    }

                    if (body) {
                        resposta.status(201).json({
                            status: true,
                            message: body
                        });
                    } else {
                        resposta.status(400).json({
                            status: false,
                            message: "Bad Request"
                        });
                    }
                });
        } else {
            resposta.status(400).json({
                status: false,
                message: "Ocorreu um erro ao fazer o pedido de autenticação"
            });
            return;
        }
    });
})

//METHOD:POST CREATEGT
//Metodo funcional, mas nao permite processeguir pois precisa de comunicar a AT
//message: 'Your credentials for communicating with the Tax Authority are incomplete. Please enter the missing details in taxes setup.'
app.post("/create_gt", function (requesto, resposta) {
    //Validacoes nos pedidos
    //cliente
    if (typeof requesto.body.party === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "party inválido: " + requesto.body.party
        });
        return;
    }
    //produto
    if (typeof requesto.body.item === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "item inválido: " + requesto.body.item
        });
        return;
    }
    //quantidade
    if (typeof requesto.body.quantity === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "quantity inválido: " + requesto.body.quantity
        });
        return;
    }
    //preço unitario
    if (typeof requesto.body.amount === "undefined") {
        resposta.status(400).json({
            status: false,
            message: "amount inválido: " + requesto.body.amount
        });
        return;
    }
    //resultado dos requests para variável
    var buyerCustomerParty = requesto.body.party;
    var item = requesto.body.item;
    var quantity = requesto.body.quantity;
    var amount = requesto.body.amount;
    //data e converter para rfc3339
    var dateTime = new Date();
    var dateTimeFormatted = dateTime.toISOString();

    //Pedir um acces token
    request({
        url: 'https://identity.primaverabss.com/core/connect/token',
        method: 'POST',
        auth: {
            user: appname, // TODO : put your application client id here
            pass: secret // TODO : put your application client secret here
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'application',
        }
    }, function (err, res) {
        if (res) {
            var json = JSON.parse(res.body);
            var access_token = json.access_token;
            var url = `${PRIMAVERA_BASE_URL}/shipping/deliveries`;
            var body = {
                "company": "REPAIRMASTERS",
                "documentType": "GT",
                "documentDate": dateTimeFormatted,
                "party": party,
                "documentLines": [{
                    "item": item,
                    "quantity": quantity,
                    "unitPrice": {"amount": amount}
                }]
            };
            request({
                    url: url,
                    method: "POST",
                    headers: {
                        "Authorization": `bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    },
                    json: true,
                    body: body
                },
                function (err, res, body) {
                    if (err) {
                        resposta.status(400).json({
                            status: false,
                            message: "Dados inválidos"
                        });
                        return;
                    }

                    if (body) {
                        resposta.status(201).json({
                            status: true,
                            message: body
                        });
                        console.log(body);
                    } else {
                        resposta.status(400).json({
                            status: false,
                            message: "Bad Request"
                        });
                    }
                });
        } else {
            resposta.status(400).json({
                status: false,
                message: "Ocorreu um erro ao fazer o pedido de autenticação"
            });
            return;
        }
    });
})

//GETCALENDAR
async function getCalendarData(startStamp, finishStamp) {
    // GCal expects parameters to be formatted per RFC3339 date norm
    const calendar = google.calendar({version: 'v3', auth: getOAuth2Client()});

    const queryResponse = await calendar.freebusy.query({
        requestBody: {
            "items": [{"id": GOOGLE_REPAIRS_CALENDAR}],
            "timeMin": startStamp,
            "timeMax": finishStamp
        }
    });

    return queryResponse.data;
}

function setOAuth2Client(auth) {
    googleOAuth2Client = auth;
}

function getOAuth2Client() {
    return googleOAuth2Client;
}

function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(GOOGLE_TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GOOGLE_SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(GOOGLE_TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', GOOGLE_TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

//Iniciar middleware
app.listen(PORT, function () {
    console.log("Middleware iniciado. A escutar o porto: " + PORT);
    // Inicializar a Google API, criando uma instancia do OAuth2Client
    // fs.readFile('credentials.json', (err, content) => {
    // 	if (err) return console.log('Error loading client secret file:', err);
    // 	authorize(JSON.parse(content), setOAuth2Client);
    // });
})
