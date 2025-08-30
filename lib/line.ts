// LINE Messaging API utilities using official SDK
import { Client, ClientConfig } from '@line/bot-sdk'
import type {
  Profile,
  TextMessage,
  Message,
  BotInfoResponse as BotInfo
} from '@line/bot-sdk'

// LINE Bot client configuration
const lineConfig: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!
}

// Create LINE Bot client
const lineClient = new Client(lineConfig)

// Re-export official types for convenience
export type { Profile, BotInfoResponse as BotInfo, TextMessage, Message } from '@line/bot-sdk'

// Get LINE bot info
export async function getLineBotInfo(): Promise<BotInfo> {
  try {
    return await lineClient.getBotInfo()
  } catch (error) {
    console.error('Error getting LINE bot info:', error)
    throw error
  }
}

// Get user profile by user ID
export async function getLineUserProfile(userId: string): Promise<Profile> {
  try {
    return await lineClient.getProfile(userId)
  } catch (error) {
    console.error('Error getting LINE user profile:', error)
    throw error
  }
}

// Send message to a specific user
export async function sendLineMessage(userId: string, message: string) {
  try {
    const textMessage: TextMessage = {
      type: 'text',
      text: message
    }

    await lineClient.pushMessage(userId, textMessage)
    return { success: true }
  } catch (error) {
    console.error('Error sending LINE message:', error)
    throw error
  }
}

// Send broadcast message to all followers
export async function sendLineBroadcast(message: string) {
  try {
    const textMessage: TextMessage = {
      type: 'text',
      text: message
    }

    await lineClient.broadcast(textMessage)
    return { success: true }
  } catch (error) {
    console.error('Error sending LINE broadcast:', error)
    throw error
  }
}