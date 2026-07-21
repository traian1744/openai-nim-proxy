const button =
document.getElementById("generateButton");


button.onclick = async ()=>{


const prompt =
document.getElementById("prompt").value;


const model =
document.getElementById("model").value;


const size =
document.getElementById("size").value;


const count =
document.getElementById("count").value;


document.getElementById("status").innerText =
"Generando imagen...";


try{


const response = await fetch(
"http://localhost:3000/v1/images/generations",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

prompt,
model,
size,
n:Number(count)

})

});


const data = await response.json();


console.log(data);



const img =
document.getElementById("resultImage");


img.src =
data.data[0].url;


img.style.display="block";


document.getElementById("status").innerText =
"Listo";


}
catch(e){

console.error(e);

document.getElementById("status").innerText =
"Error";

}


};
