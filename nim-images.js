const axios = require("axios");

const NIM_API_BASE =
    process.env.NIM_API_BASE || "https://integrate.api.nvidia.com/v1";

const NIM_API_KEY = process.env.NIM_API_KEY;

/*
|--------------------------------------------------------------------------
| Cliente HTTP
|--------------------------------------------------------------------------
*/

const client = axios.create({

    baseURL: NIM_API_BASE,

    headers: {

        Authorization: `Bearer ${NIM_API_KEY}`,

        "Content-Type": "application/json"

    },

    timeout: 300000

});

/*
|--------------------------------------------------------------------------
| Obtener modelos
|--------------------------------------------------------------------------
*/

async function getModels() {

    const response = await client.get("/models");

    return response.data;

}

/*
|--------------------------------------------------------------------------
| Generación de imágenes
|--------------------------------------------------------------------------
|
| De momento dejamos el método preparado.
| En la siguiente parte lo conectaremos con FLUX Kontext.
|
*/

async function generateImage(payload){

    const response = await client.post(
        "/images/generations",
        payload
    );


    return response.data;

}

/*
|--------------------------------------------------------------------------
| Editar imágenes
|--------------------------------------------------------------------------
*/

async function editImage(payload) {

    throw new Error(
        "editImage() todavía no fue implementado."
    );

}

/*
|--------------------------------------------------------------------------
| Variaciones
|--------------------------------------------------------------------------
*/

async function variationImage(payload) {

    throw new Error(
        "variationImage() todavía no fue implementado."
    );

}

module.exports = {

    client,

    getModels,

    generateImage,

    editImage,

    variationImage

};
