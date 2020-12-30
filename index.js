const express = require("express");
const request = require('request');
const app = express();

//Wildcards
// Test subscription
// const user = '244121';
// const subscription = '244121-0001';
// const  appname = 'TESTE2344';
// const  secret = 'b23d3e6d-0ae6-41e0-bd63-5e0a99ae75cb';

//Subscription
const user = '245098';
const subscription = '245098-0001';

//App
const  appname = 'IEOP2020';
const  secret = '870c226e-e18f-46d4-b548-91a7c6987425';

//Server
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = 3000;

//Rota primária - Indicar que a api está a funcionar
app.get("/", function(req, res) {
    res.status(200).json({
        status: true,
        message: "Sucess"
    })
})

//GET KEY
app.get('/chave', function(req,res) {
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
    }, function(err, response) {
        if (response) {
            let json = JSON.parse(response.body);
            res.status(200).json({
                status:true,
                message:json.access_token
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

//verificar nif de cliente
//no postman colocar nif como parametro no body e na value o seu respectivo nif
//nif - 545192323
app.post("/verificarnif", function(requesto, resposta) {
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
    }, function(err, res) {
        if (res) {

            var json = JSON.parse(res.body);
            var access_token = json.access_token;

            var url = `http://my.jasminsoftware.com/api/`+ user +`/`+ subscription +`/salescore/customerParties/odata?$filter=CompanyTaxID eq '${nif}'`;
console.log(url);
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
                function(err, res) {

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
app.get("/customers", function(req,res) {
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
        }, function(err, response) {
            if (response) {
                let json = JSON.parse(response.body);
                let access_token = json.access_token;
                let url = 'http://my.jasminsoftware.com/api/'+ user +'/'+ subscription +'/salescore/customerParties';

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
                    function(err, response) {
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
app.get("/allitems", function(req,res) {
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
        }, function(err, response) {
            if (response) {
                let json = JSON.parse(response.body);
                let access_token = json.access_token;
                let url = 'http://my.jasminsoftware.com/api/'+ user +'/'+ subscription +'/salescore/salesitems';

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
                    function(err, response) {
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

//api/{tenantKey}/{orgKey}/materialsCore/materialsItems/{itemKey}/extension
//materialscore/materialsItems/list?listname=MaterialsItems

//TODO: filtrar a resposta json com o resultado e booleano
app.get("/materials", function(req,res) {

    //itemKey do material
    var itemKey = req.body.itemKey;

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
    }, function(err, response) {
        if (response) {
            let json = JSON.parse(response.body);
            let access_token = json.access_token;
            let url = 'http://my.jasminsoftware.com/api/'+ user +'/'+ subscription +'/materialscore/materialsItems/'+itemKey+'/extension';
            //let url = 'http://my.jasminsoftware.com/api/'+ user +'/'+ subscription +'/materialscore/materialsItems/';

            console.log(url);

            var data = response;

            var res = data.map(({status, stockBalance}) => ({status, stockBalance}));
            console.log(res);

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
                function(err, response) {
                    if (err) {
                        response.status(200).json({
                            status: false,
                            message: "Problemas!"
                        });
                        return;
                    }
                    let json = JSON.parse(response.body);

                    if (json) {
                        res.status(200).json({
                            status: true,
                            message: json
                        });
                    } else {
                        res.status(200).json({
                            status: false,
                            message: "Não existem dados!"
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








/**
 * Method Type : POST
 * Endpoint : /verificarnif
 * PARAMS:
 *      nif - o número de contribuinte do utente
 * Result:
 *      status - booleano que indica se foi feito o pedido com sucesso
 *      message - string que contêm o nome ou o erro
 */
app.post("/verificarnif", function(request, resposta) {
    if (typeof request.body.nif === "undefined") {
        resposta.status(200).json({
            status: false,
            message: "Tem de inserir um nif"
        });
        return;
    }

    let nif = request.body.nif;

    //Pedir um acces token   
    request({
        url: 'https://identity.primaverabss.com/core/connect/token',
        method: 'POST',
        auth: {
            user: 'TESTE2344',
            pass: 'b23d3e6d-0ae6-41e0-bd63-5e0a99ae75cb'
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'application',
        }
    }, function(err, res) {
        if (res) {

            let json = JSON.parse(res.body);
            let access_token = json.access_token;
            let url = `http://my.jasminsoftware.com/api/243221/243221-0001/salescore/customerParties/odata?$filter=CompanyTaxID eq '${nif}'`;
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

                function(err, res) {
                    if (err) {
                        resposta.status(200).json({
                            status: false,
                            message: "Tens de inserir um nif"
                        });
                        return;
                    }
                    let json = JSON.parse(res.body);

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
        }
    });
});

//POST CUSTOMER M
/**
 *  Method: POST
 *  endpoint: /createcliente
 *  PARAMS:
 *      Nome Próprio 
 *      Data de Nascimento
 *      E-mail 
 *      Telefone
 *      nif
 * 
 *  retorno:
 *      status,
 *      message: id
 */
app.post("/createcliente", function(request, resposta) {

    if (typeof request.body.nome === "undefined") {
        resposta.status(200).json({
            status: false,
            message: "É necessário inserir um nome"
        });
        return;
    }

    if (typeof request.body.data === "undefined") {
        resposta.status(200).json({
            status: false,
            message: "É necessário inserir uma data"
        })
        return;
    }

    if (typeof request.body.email === "undefined") {
        resposta.status(200).json({
            status: false,
            message: "É necessário inserir um endereço de email"
        })
        return;
    }

    if (typeof request.body.telefone === "undefined") {
        resposta.status(200).json({
            status: false,
            message: "É necessário inserir um número telefónico"
        })
        return;
    }

    if (typeof request.body.nif === "undefined") {
        resposta.status(200).json({
            status: false,
            message: "É necessário inserir um NIF"
        })
        return;
    }

    request({
        url: 'https://identity.primaverabss.com/core/connect/token',
        method: 'POST',
        auth: {
            user: 'TESTE2344',
            pass: 'b23d3e6d-0ae6-41e0-bd63-5e0a99ae75cb'
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'application',
        }
    }, function(err, res) {
        if (res) {
            //fazer o pedido de criaçao de cliente
            let baseUrlCriarCliente = "http://my.jasminsoftware.com/api/243221/243221-0001";
            let resourceCriarUtente = "/salesCore/customerParties";
            let json = JSON.parse(res.body);
            let access_token = json.access_token;
            console.log(access_token);
            let urlPedido = `${baseUrlCriarCliente + resourceCriarUtente}`;

            request({
                url: urlPedido,
                method: "POST",
                headers: {
                    "Authorization": `bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                form: {
                    scope: 'application'
                },
                data: {
                    name: request.body.nome,
                    isExternallyManaged: false,
                    currency: "EUR",
                    isPerson: true,
                    country: "PT"
                }
            }, function(err) {
                if (err) {
                    resposta.status(200).json({
                        status: false,
                        message: "Ocorreu um erro ao fazer o pedido de autenticação"
                    });
                } else {
                    resposta.status(200).json({
                        status: true,
                        message: "Cliente inserido"
                    });
                }
            });
        } else {
            resposta.status(200).json({
                status: false,
                message: "Ocorreu um erro ao fazer o pedido de autenticação"
            });
        }
    });
});

//GET ESPECIALIDADE M
/**
 * METHOD: GET
 * ENDPOINT: /getespecialidades
 * Filtrar por grupo
 * retorna uma lista com as especialidades
 * 
 */
app.get("/getespecialidades", function(request, resposta) {
    //Pedir um acces token
    request({
        url: 'https://identity.primaverabss.com/core/connect/token',
        method: 'POST',
        auth: {
            user: 'TESTE2344',
            pass: 'b23d3e6d-0ae6-41e0-bd63-5e0a99ae75cb'
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'application',
        }
    }, function(err, res) {
        if (res) {

            let json = JSON.parse(res.body);
            let access_token = json.access_token;

            let url = `http://my.jasminsoftware.com/api/243221/243221-0001/salescore/salesitems/odata?$filter=Description eq 'Consulta'`;

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
                function(err, res) {

                    if (err) {
                        resposta.status(200).json({
                            status: false,
                            message: "Tenho problemas!"
                        });
                        return;
                    }

                    let json = JSON.parse(res.body);

                    if (json.items.length > 0) {
                        let Arr = [];
                        json.items.forEach(item => Arr.push(item.complementaryDescription));
                        console.log("Sucesso");
                        resposta.status(200).json({
                            status: true,
                            message: Arr
                        });
                    } else {
                        resposta.status(200).json({
                            status: false,
                            message: "Não existem especialidades!"
                        });
                    }

                });
        } else {
            resposta.status(200).json({
                status: false,
                message: "Ocorreu um erro ao fazer o pedido de autenticação"
            });
        }
    });
});

//POST ENCOMENDA 
/**
 * METHOD: POST
 * ENDPOINT: /createencomenda
 *  PARAMS: idUtente, idEspecialidade/artigo
 * 
 *  status: true
 *  status: 
 * 
 */
app.post("/createencomenda", function(request) {

});


//Iniciar middleware
app.listen(PORT, function() {
    console.log("Middleware iniciado. A escutar o porto: " + PORT);
})


/*
let request = require('request');

request({
  url: 'https://identity.primaverabss.com/core/connect/token',
  method: 'POST',
  auth: {
    user: 'TESTE2344',
    pass: 'b23d3e6d-0ae6-41e0-bd63-5e0a99ae75cb'
  },
  form: {
    'grant_type': 'client_credentials',
    'scope': 'application',
  }
}, function(err, res) {
  if (res) {
    var json = JSON.parse(res.body);
    console.log("Access Token:", json.access_token);

  }
  else {
    console.log("Could not obtain acess token.");
  }
});
 */



