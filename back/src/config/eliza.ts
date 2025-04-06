import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ELIZA_URL = process.env.PUBLIC_ELIZA_URL || 'http://localhost:3021/46995be7-c4cb-0252-82cd-009ab61164e5';

export const elizaClient = {
  analyzeTransaction: async (TransactionID: any) => {
    try {
      const response = await axios.post(`${ELIZA_URL}/message`, {
        text: process.env.MESSAGE_FOR_ANALYSE + TransactionID
      });
      return response.data;
    } catch (error) {
      console.error('Error communicating with ElizaOS:', error);
      throw error;
    }
  },

  submitTask: async (taskData: any) => {
    try {
      const response = await axios.post(`${ELIZA_URL}/api/task`, taskData);
      return response.data;
    } catch (error) {
      console.error('Error submitting task to ElizaOS:', error);
      throw error;
    }
  }
}; 