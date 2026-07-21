
import dotenv from "dotenv";
dotenv.config();

console.log("API KEY:", process.env.NIM_API_KEY?.substring(0, 10));
const response = await fetch(
    "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell",
    {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.NIM_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            prompt: "a red apple",
            width: 1024,
            height: 1024,
            seed: 0,
            steps: 4
        })
    }
);

console.log("STATUS:", response.status);

const text = await response.text();

console.log(text);
