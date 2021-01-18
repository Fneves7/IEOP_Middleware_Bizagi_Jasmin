const fs = require('fs');
const express = require("express");
const request = require('request');
const readline = require('readline');
const { google } = require('googleapis');
const moment = require('moment');

const app = express();
const PORT = 3000;

//Subscription
const user = '246568';
const subscription = '246568-0001';

//App
const appname = 'IEOP2021';
const secret = '8fc6bbb6-3da0-4e57-8d11-aaefd1e4db6f';

const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const GOOGLE_REPAIRS_CALENDAR = 'pte14c0njg915aq8hdbqi1lm98@group.calendar.google.com';
const GOOGLE_TOKEN_PATH = 'token.json';

const PRIMAVERA_BASE_URL = `http://my.jasminsoftware.com/api/${user}/${subscription}`;

let googleOAuth2Client;

//Server
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Rota primária - Indicar que a api está a funcionar
app.get("/", function (req, res) {
	res.status(200).json({
		status: true,
		message: "Sucess"
	})
})

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
			//var url = `http://my.jasminsoftware.com/api/`+ user +`/`+ subscription +`/materialscore/materialsItems/`+itemKey+`/extension/odata?$filter=itemKey eq '${itemKey}'`;
			var url = `http://my.jasminsoftware.com/api/` + user + `/` + subscription + `/materialscore/materialsItems/` + itemKey + `/extension/`;

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
					console.log(url);
					var json = JSON.parse(res.body);
					var i = 1;
					var wharehouse = json.materialsItemWarehouses
					var prodstock
					for (i = 0; i < 3; i++) {
						if (wharehouse[i].stockBalance > 0) {
							prodstock = wharehouse[i].stockBalance
							//console.log(wharehouse[i].stockBalance)
							console.log(prodstock);
						}
					}
					if (json) {
						console.log("Sucesso");
						resposta.status(200).json({
							status: true,
							message: "Stock por armazém: " + prodstock
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

//Criar orcamento
//api/{tenantKey}/{orgKey}/sales/quotations/{companyKey}/{documentType}/{serie}/{seriesNumber}/documentLines
//api/{tenantKey}/{orgKey}/sales/quotations/{companyKey}/{documentType}/{serie}/{seriesNumber}/documentLines/{lineId}/salesItem
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
			var url = `https://my.jasminsoftware.com/api/` + user + `/` + subscription + `/sales/quotations`;
			// var url = `https://my.jasminsoftware.com/api/` + user + `/` + subscription + `/sales/quotations/` + companyKey + `/` + documentType + `/` + serie + `/` + seriesNumber + `/documentLines/`;
			var body = {
				"company": "REPAIRMASTERS",
				"emailTo": emailTo,
				"buyerCustomerParty": buyerCustomerParty,
				"documentDate": dateTimeFormatted,
				"documentLines": [
					{ "salesItem": salesItem }]
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

async function getCalendarData(startStamp, finishStamp) {
	// GCal expects parameters to be formatted per RFC3339 date norm
	const calendar = google.calendar({ version: 'v3', auth: getOAuth2Client() });

	const queryResponse = await calendar.freebusy.query({
		requestBody: {
			"items": [{ "id": GOOGLE_REPAIRS_CALENDAR }],
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
	const { client_secret, client_id, redirect_uris } = credentials.installed;
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
	fs.readFile('credentials.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		authorize(JSON.parse(content), setOAuth2Client);
	});
})
