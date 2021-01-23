const fs = require('fs');
const express = require("express");
const request = require('request');
const readline = require('readline');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
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
app.use(express.urlencoded({ extended: true }));

//Rota primária - Indicar que a api está a funcionar
app.get("/", function (req, res) {
	res.status(200).json({
		status: true,
		message: "Sucess"
	})
})

//METHOD:POST->Quotation (Orçamento)
app.post('/quotation', (req, res) => {
	var components = req.body.components;
	var billedHours = req.body.billedHours;
	var services = req.body.services;

	const comp = components.map(elem => ({ "salesItem": elem.itemKey, "quantity": 1 }))
	const serv = services.map(elem => ({ "salesItem": elem.itemKey, "quantity": 1 }))
	serv.push({ "salesItem": 'S1', "quantity": billedHours });
	var salesItems = [...comp, ...serv];

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
	},
		(err, response) => {
			if (response) {
				//data e converter para rfc3339
				var dateTime = new Date();
				var dateTimeFormatted = dateTime.toISOString();
				var json = JSON.parse(response.body);
				var access_token = json.access_token;
				var url = `${PRIMAVERA_BASE_URL}/sales/quotations`;
				var body = {
					"company": "REPAIRMASTERS",
					"buyerCustomerParty": "INDIF",
					"documentDate": dateTimeFormatted,
					"documentLines": salesItems
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
					function (err, resp, body) {
						if (err) {
							res.status(400).json({
								status: false,
								message: "Dados inválidos"
							});
							return;
						}
						if (body) {
							url = `${PRIMAVERA_BASE_URL}/sales/quotations/${body}/print`;
							json = JSON.parse(response.body);
							access_token = json.access_token;
							const filename = `ORC_${moment().unix()}.pdf`;
							const filepath = `./public/${filename}`;
							let file = fs.createWriteStream(filepath);

							request({
								uri: url,
								headers: {
									'Authorization': `bearer ${access_token}`,
									'Accept-Encoding': 'gzip, deflate, br',
									'Cache-Control': 'max-age=0',
									'Connection': 'keep-alive',
									'Upgrade-Insecure-Requests': '1',
								},
							})
								.pipe(file)
								.on('finish', () => {
									res.status(200).json({
										link: `http://localhost:3000/files?filename=${filename}`
									})
								})
								.on('error', (error) => {
									console.log(error);
									res.status(500).json({})
								})
						} else {
							res.status(400).json({
								status: false,
								message: "Bad Request"
							});
						}
					});
			} else {
				res.status(400).json({
					status: false,
					message: "Ocorreu um erro ao fazer o pedido de autenticação"
				});
				return;
			}
		});
})

//Imprimir documentos no servidor
app.get('/files', (req, res) => {
	let filename = req.query.filename;
	const arr = filename.split('.');
	if(arr.length === 1) {
		filename += ".pdf";
	}
	res.sendFile(__dirname + `/public/${filename}`);
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

//METHOD:GETSTOCK Obter stocks de produtos
app.post("/get_stock", function (requesto, resposta) {
	var comp = requesto.body.components;

	var filter = `ItemKey eq '${comp[0].itemKey}'`;
	if (comp.length > 1) {
		for (let i = 1; i < comp.length; i++) {
			filter += ` or ItemKey eq '${comp[i].itemKey}'`;
		}
	}
	//Pedir um acces token
	request({
		url: 'https://identity.primaverabss.com/core/connect/token',
		method: 'POST',
		auth: {
			user: appname,
			pass: secret
		},
		form: {
			'grant_type': 'client_credentials',
			'scope': 'application',
		}
	}, function (err, res) {
		if (res) {
			var json = JSON.parse(res.body);
			var access_token = json.access_token;
			var url = `${PRIMAVERA_BASE_URL}/materialscore/materialsItems/odata?$filter=${filter}`;
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
					var output = '';
					if (json) {
						const semStock = json.items.filter((element) => element.materialsItemWarehouses[2].stockBalance === 0);
						var filt = '';

						if (semStock.length > 0) {
							semStock.forEach(element => {
								filt += `${element.itemKey} - ${element.description} sem stock! \n`;
							});

							resposta.status(200).json({
								status: false,
								message: filt
							});
						} else {
							resposta.status(200).json({
								status: true,
								message: output
							});
						}
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

//METHOD:POST CREATEINVOICE (Fatura)
app.post("/create_invoice", function (req, res) {
	var components = req.body.components;
	var services = req.body.services;
	var billedHours = req.body.billedHours;

	const comp = components.map(elem => ({ "salesItem": elem.itemKey, "quantity": 1, "warehouse": "VIANA01"}))
	const serv = services.map(elem => ({ "salesItem": elem.itemKey, "quantity": 1 }))
	serv.push({ "salesItem": 'S1', "quantity": billedHours });
	var salesItems = [...comp, ...serv];

	//data e converter para rfc3339
	var dateTime = new Date();
	var dateTimeFormatted = dateTime.toISOString();

	//Pedir um acces token
	request({
		url: 'https://identity.primaverabss.com/core/connect/token',
		method: 'POST',
		auth: {
			user: appname,
			pass: secret
		},
		form: {
			'grant_type': 'client_credentials',
			'scope': 'application',
		}
	}, function (err, response) {
		if (response) {
			var json = JSON.parse(response.body);
			var access_token = json.access_token;
			var url = `${PRIMAVERA_BASE_URL}/billing/invoices/`;
			var body = {
				"company": "REPAIRMASTERS",
				"documentType": "FA",
				"buyerCustomerParty": "INDIF",
				"documentDate": dateTimeFormatted,
				"documentLines": salesItems
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
				function (err, resp, body) {
					if (err) {
						res.status(400).json({
							status: false,
							message: "Dados inválidos"
						});
						return;
					}
					if (body) {
						urlprint = `${PRIMAVERA_BASE_URL}/billing/invoices/${body}/print`;
						json = JSON.parse(response.body);
						access_token = json.access_token;
						const filename = `FA_${moment().unix()}.pdf`;
						const filepath = `./public/${filename}`;
						let file = fs.createWriteStream(filepath);

						request({
							uri: urlprint,
							headers: {
								'Authorization': `bearer ${access_token}`,
								'Accept-Encoding': 'gzip, deflate, br',
								'Cache-Control': 'max-age=0',
								'Connection': 'keep-alive',
								'Upgrade-Insecure-Requests': '1',
							},
						})
						.pipe(file)
						.on('finish', () => {
							res.status(200).json({
								link: `http://localhost:3000/files?filename=${filename}`
							})
						})
						.on('error', (error) => {
							console.log(error)
							res.status(500).json({})
						})
					} else {
						res.status(400).json({
							status: false,
							message: "Bad Request"
						});
					}
				});
		} else {
			res.status(400).json({
				status: false,
				message: "Ocorreu um erro ao fazer o pedido de autenticação"
			});
			return;
		}
	});
})

//METHOD:POST CREATEORDER (Encomendas)
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
				"documentLines": [{ "salesItem": salesItem }]
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

//METHOD:POST CREATEGT (guias de transporte)
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
					"unitPrice": { "amount": amount }
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

//email
app.post('/email', (req, res) => {
	const emailType = req.query.emailType;
	const customerEmail = req.body.emailTo;
	const link = req.body.link;
	var emailBody;

	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: 'ieoprepairmasters@gmail.com',
			pass: '@vH6@Ps56kH2Vt'
		}
	});
	if (emailType === 'Fim') {
		emailBody = `
            <p>Bom dia,</p>
            <p>O/a seu equipamento já foi reparado pelos nossos técnicos e será entregue nos próximos 3 dias úteis.</p>
            <p>Cumprimentos,</p>
            <p>RepairMasters.</p>`
	} else {
		var emailBody = `
            <p>Bom dia,</p>
            <p>O/a seu/sua ${emailType} pode ser consultado/a <a href="${link}">aqui</a></p>
            <p>Cumprimentos,</p>
            <p>RepairMasters.</p>`
	}

	const mailOptions = {
		from: 'ieoprepairmasters@gmail.com',
		to: `${customerEmail}`,
		subject: `${emailType} de Reparação`,
		html: `${emailBody}`
	};

	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error);
		} else {
			res.status(200).json({
				message: "Email successfully sent!"
			})
			console.log('Email sent: ' + info.response);
		}
	});
});

//GETCALENDAR
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
	console.clear();
	console.log("Middleware iniciado. A escutar o porto: " + PORT);
	// Inicializar a Google API, criando uma instancia do OAuth2Client
	fs.readFile('credentials.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		authorize(JSON.parse(content), setOAuth2Client);
	});
})
