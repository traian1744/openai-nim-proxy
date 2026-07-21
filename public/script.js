const API_URL = "http://localhost:3000";


const promptInput = document.getElementById("prompt");
const modelInput = document.getElementById("model");
const sizeInput = document.getElementById("size");
const countInput = document.getElementById("count");

const button = document.getElementById("generateButton");
const status = document.getElementById("status");
const resultImage = document.getElementById("resultImage");


button.onclick = async () => {

    const prompt = promptInput.value;

    if (!prompt) {
        alert("Poné un prompt");
        return;
    }


    status.innerText = "Generando imagen...";
    resultImage.src = "";

    button.disabled = true;


    try {

        const response = await fetch(
            `${API_URL}/v1/images/generations`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    model: modelInput.value,

                    prompt: prompt,

                    size: sizeInput.value,

                    n: Number(countInput.value)

                })
            }
        );


        const data = await response.json();


        console.log("RESPUESTA BACKEND:");
        console.log(data);


        if (data.data && data.data[0]) {

            const base64 = data.data[0].b64_json;

            resultImage.src =
                "data:image/png;base64," + base64;

            status.innerText = "Imagen generada";

        }
        else {

            throw new Error(
                JSON.stringify(data)
            );

        }


    } catch(error) {

        console.error("ERROR:", error);

        status.innerText =
            "Error generando imagen";

    }


    button.disabled = false;

};
