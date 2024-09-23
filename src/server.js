// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS if your frontend is hosted on a different domain

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Ensure your API key is stored securely
const DEFAULT_WORD_COUNT = 15

// Access code verification endpoint
app.post('/api/verify-access-code', (req, res) => {
  const { accessCode } = req.body;

  // Check if the provided access code matches the environment variable
  if (accessCode === process.env.NOVELIST_ACCESS_CODE) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/generate', async (req, res) => {
  const { protagonist, outline, author, storyContext, wordCount } = req.body;

  // Check if the storyContext ends with a sentence-ending punctuation mark
  const endsWithPunctuation = /[.!?]\s*$/.test(storyContext);

  // Determine the capitalization instruction
  const capitalizationInstruction = endsWithPunctuation
    ? "Your response shall start with a capital letter."
    : "Your response shall start with a lowercase letter, unless it is a person's name.";

  const prompt = `
    Continue or complete the last sentence of the story based on the context provided and your understanding. The context includes the last 200 words of the story so far.

    Ensure your continuation:

    •	Logically follows from the context.
    •	Is coherent with the protagonist’s characteristics and the story outline.
    •	Adheres to the tone and style of ${author}.
    •	Avoid repeating any previous content. 
    
    Start with the appropriate capitalization as instructed.
    
    Protagonist:  ${protagonist}
    
    Story Outline: ${outline}
    
    Context (last 200 words of the story so far):
    
    "${storyContext}"
    
    ${capitalizationInstruction}
    `;

  console.log(prompt)
  effective_wordCount = wordCount
  if (!wordCount) {
    effective_wordCount = DEFAULT_WORD_COUNT;
  }
  // Determine max_tokens based on wordCount. Always generate more words, and trim the result later
  const maxTokens = effective_wordCount * 2

  const data = {
    model: 'gpt-4o', // Use 'gpt-3.5-turbo' or 'gpt-4' if available
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: maxTokens, // Use the calculated maxTokens
    temperature: 0.7,
    n: 1,
  };

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const generatedText = response.data.choices[0].message.content;
    const trimmedText = generatedText.split(/\s+/).slice(0, effective_wordCount).join(' ');
    res.json({ generatedText: trimmedText.trim() });
  } catch (error) {
    console.error('Error generating completion:', error.response.data);
    res.status(500).json({ error: 'Error generating completion' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});