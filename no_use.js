const express = require("express");
const request = require('request');
const app = express();

//Subscription
const user = '246568';
const subscription = '246568-0001';

//App
const appname = 'IEOP2020';
const secret = '870c226e-e18f-46d4-b548-91a7c6987425';

//Server
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = 3000;

//Rota primária - Indicar que a api está a funcionar
app.get("/", function (req, res) {
	res.status(200).json({
		status: true,
		message: "Sucess"
	})
})

//METHOD:GET->GETSTOCK
//output do armazem e stock
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
			//pegar só num produto
			var url = `${PRIMAVERA_BASE_URL}/materialscore/materialsItems/${itemKey}`;
			// var url = `${PRIMAVERA_BASE_URL}/materialscore/materialsItems/odata?$filter=ItemKey eq 'A12' or ItemKey eq 'A13'`;
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
					var warehouse = json.materialsItemWarehouses
					if (json) {

						// foreach dos armazéns
						json.materialsItemWarehouses.forEach(element => {
							if (element.stockBalance) {
								resposta.status(200).json({
									status: true,
									message: {
										"Armazém": element.warehouse,
										"Stock": element.stockBalance
									}
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

//GET KEY
app.get('/chave', function (req, res) {
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
			let json = JSON.parse(response.body);
			res.status(200).json({
				status: true,
				message: json.access_token
			});
			//console.log("Access Token:"+'\n', json.access_token);
		}
		else {
			let json = JSON.parse(response.body);
			res.status(401).json({
				status: false,
				message: 'Something went wrong'
			});
			console.log("Could not obtain access token.");
		}
	});
})

//GET KEY
app.get('/chave', function (req, res) {
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
			let json = JSON.parse(response.body);
			res.status(200).json({
				status: true,
				message: json.access_token
			});
			//console.log("Access Token:"+'\n', json.access_token);
		}
		else {
			let json = JSON.parse(response.body);
			res.status(401).json({
				status: false,
				message: 'Something went wrong'
			});
			console.log("Could not obtain access token.");
		}
	});
})



//pedido para ver todos os items (GET)
app.get("/item", function (req, res) {
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
			let json = JSON.parse(response.body);
			let access_token = json.access_token;
			let url = 'http://my.jasminsoftware.com/api/' + user + '/' + subscription + '/salescore/salesitems';

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
				function (err, response) {
					if (err) {
						response.status(200).json({
							status: false,
							message: "Problemas!"
						});
						return;
					}
					let json = JSON.parse(response.body);
					//ver o output do pedido
					//console.log(json);

					if (json) {
						res.status(200).json({
							status: true,
							message: json
						});
					} else {
						res.status(200).json({
							status: false,
							message: "Não existem especialidades!"
						});
					}
				});
		} else {
			res.status(200).json({
				status: false,
				message: "Ocorreu um erro ao fazer o pedido de autenticação"
			});
		}
	});
})

//verificar nif de cliente
//no postman colocar nif como parametro no body e na value o seu respectivo nif
//nif - 545192323
app.post("/verificarnif", function (requesto, resposta) {
	if (typeof requesto.body.nif === "undefined") {
		resposta.status(200).json({
			status: false,
			message: "Tens de inserir um nif"
		});
		return;
	}

	var nif = requesto.body.nif;

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
			var url = `http://my.jasminsoftware.com/api/` + user + `/` + subscription + `/salescore/customerParties/odata?$filter=CompanyTaxID eq '${nif}'`;

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
						resposta.status(200).json({
							status: false,
							message: "Tens de inserir um nif"
						});
						return;
					}

					var json = JSON.parse(res.body);

					if (json.items.length > 0) {
						console.log("Sucesso");
						resposta.status(200).json({
							status: true,
							message: json.items[0].name
						});
					} else {
						resposta.status(200).json({
							status: false,
							message: "Não existe esse utente"
						});
					}
				});
		} else {
			resposta.status(200).json({
				status: false,
				message: "Ocorreu um erro ao fazer o pedido de autenticação"
			});
			return;
		}
	});
})

//pedido para ver clientes (GET)
//https://my.jasminsoftware.com/245098/245098-0001/#/salescore/customerParties/list?listname=CustomerParties
app.get("/customers", function (req, res) {
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
			let json = JSON.parse(response.body);
			let access_token = json.access_token;
			let url = 'http://my.jasminsoftware.com/api/' + user + '/' + subscription + '/salescore/customerParties';

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
				function (err, response) {
					if (err) {
						response.status(200).json({
							status: false,
							message: "Problemas!"
						});
						return;
					}

					let json = JSON.parse(response.body);

					//ver o output do pedido
					//console.log(json);

					if (json) {
						res.status(200).json({
							status: true,
							message: json
						});
					} else {
						res.status(200).json({
							status: false,
							message: "Não existem especialidades!"
						});
					}
				});
		} else {
			res.status(200).json({
				status: false,
				message: "Ocorreu um erro ao fazer o pedido de autenticação"
			});
		}
	});
})

//pedido para ver items (GET)
app.get("/allitems", function (req, res) {
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
			let json = JSON.parse(response.body);
			let access_token = json.access_token;
			let url = 'http://my.jasminsoftware.com/api/' + user + '/' + subscription + '/salescore/salesitems';

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
				function (err, response) {
					if (err) {
						response.status(200).json({
							status: false,
							message: "Problemas!"
						});
						return;
					}
					let json = JSON.parse(response.body);
					//ver o output do pedido
					//console.log(json);

					if (json) {
						res.status(200).json({
							status: true,
							message: json
						});
					} else {
						res.status(200).json({
							status: false,
							message: "Não existem especialidades!"
						});
					}
				});
		} else {
			res.status(200).json({
				status: false,
				message: "Ocorreu um erro ao fazer o pedido de autenticação"
			});
		}
	});
})

//Ver stock de um produto e retornar a loja e um valor booleano
app.get("/verstock", function (requesto, resposta) {
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
						wharehouse
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
							// message: json.message
							// message: "Stock por armazém: " + json.materialsItemWarehouses
							// message: "Stock por armazém: " + json.materialsItemWarehouses[2].stockBalance
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
