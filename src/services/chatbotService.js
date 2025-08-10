import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const generateCodingChallenge = async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

    const prompt = `Generate a LeetCode-style coding challenge. Provide the problem statement, constraints, and 2-3 test cases, but do not provide the solution.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        return text;
    } catch (error) {
        console.error("Error generating coding challenge:", error);
        return "Error generating coding challenge. Please try again.";
    }
};

export const generateContextualResponse = async (userId, message) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

    const prompt = `As a learning assistant chatbot named HexaBot, provide a helpful and encouraging response to the following user message: "${message}".`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        return text;
    } catch (error) {
        console.error("Error generating contextual response:", error);
        return "I am having trouble understanding. Please try again.";
    }
};

export const evaluateCode = async (question, code) => {    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});    const prompt = `Evaluate the following code for the given question. If the code is correct, start your response with the word "Correct". If the code is incorrect, check for syntax errors. If there is a syntax error, respond with the phrase "Syntax Error". Otherwise, provide a brief evaluation of the code.\n\nQuestion: ${question}\n\nCode:\n${code}`;    try {        const result = await model.generateContent(prompt);        const response = await result.response;        const text = await response.text();        return text;    } catch (error) {        console.error("Error evaluating code:", error);        return "Error evaluating code. Please try again.";    }};

export const runCode = async (question, code) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

    const prompt = `Run the following code for the given question and provide the output. If there are any errors, provide the error message.\n\nQuestion: ${question}\n\nCode:\n${code}\n\nOutput:`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text();
        return text;
    } catch (error) {
        console.error("Error running code:", error);
        return "Error running code. Please try again.";
    }
};
