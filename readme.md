# Middleware para o jasmin

## Endpoints

### A. Endpoint de teste
__Endpoint:__ "/"

__Método:__ GET

__Parâmetros:__ Nenhum

__Retorno:__ Este endpoint tem o seguinte output:

```JavaScript
{
    status: Boolean,        //Retorna sempre true
    message: String         //Retorna "Herro"
}
```

### B. Endpoint de verificar se existe o utilizador
__Endpoint:__ "/verificarnif"

__Método:__ POST

__Parâmetros:__ Este endpoint tem os seguintes parâmetros:
```JavaScript
{
    nif: String         //Número de contribuinte do cliente
}
```

__Retorno:__ Este endpoint tem o seguinte output:
```JavaScript
{
    status: Boolean,    //Se for sucesso retorna true
    message: String     //Se for sucesso retorna o nome, caso contrário retorna uma mensagem de erro
}
```

### C. Endpoint de criar o utilizador

---------------------------------------
# DANGER AINDA NÃO IMPLEMENTADO

__Endpoint:__ "/createcliente"

__Método:__ POST

__Parâmetros:__ Este endpoint tem os seguintes parâmetros:
```JavaScript
{
    nome: String,       //Nome do utente
    data: String,       //data de nascimento do utente
    email: String,      //email do utente
    telefone: String,   //telefone do utente
    nif: String         //Número de contribuinte do cliente
}
```

__Retorno:__ Este endpoint tem o seguinte output:
```JavaScript
{
    status: Boolean,    //Se for sucesso retorna true
    message: String     //Retorna o id do utente criado
}
```

### D. Endpoint de buscar as especialidades

__Endpoint:__ "/getespecialidades"

__Método:__ GET

__Parâmetros:__ Nenhum

__Retorno:__ Este endpoint tem o seguinte output:
```JavaScript
{
    status: Boolean,    //Se for sucesso retorna true
    message: Array     //Retorna os nomes das especialidades
}
```

