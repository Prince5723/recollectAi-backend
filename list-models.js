import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    console.log('\n📋 Listing available Gemini models...\n');
    
    const models = await genAI.listModels();
    
    console.log('Available models:');
    for (const model of models) {
      console.log(`\n✅ ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

listModels();

