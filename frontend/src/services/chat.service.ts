import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { create } from "@bufbuild/protobuf";
import { ChatService } from "../gen/proto/chat/v1/chat_pb";
import { 
  type ChatEvent,
  JoinRequestSchema,
  SendMessageRequestSchema,
  LeaveRequestSchema 
} from "../gen/proto/chat/v1/chat_pb";

export class ChatClient {
  private client;
  private userId: string | null = null;
  private abortController: AbortController | null = null;
  
  constructor() {
    const transport = createConnectTransport({
      baseUrl: "http://localhost:8080",
    });
    this.client = createClient(ChatService, transport);
  }
  
  async *join(username: string): AsyncGenerator<ChatEvent> {
    console.log("ChatClient.join called with username:", username);
    
    // 前の接続があれば切断
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();
    
    try {
      const request = create(JoinRequestSchema, { username });
      console.log("Calling server join method...");
      
      const stream = this.client.join(request, {
        signal: this.abortController.signal
      });
      
      console.log("Stream created, starting to listen for events...");
      
      for await (const event of stream) {
        console.log("Received event from server:", event);
        
        // ConnectionAcceptedイベントからuserIdを保存
        if (event.event.case === "connectionAccepted") {
          this.userId = event.event.value.userId;
          console.log("User ID saved:", this.userId);
        }
        
        yield event;
      }
    } catch (error) {
      console.error("Error in join stream:", error);
      throw error;
    }
  }
  
  async sendMessage(content: string): Promise<void> {
    if (!this.userId) {
      throw new Error("Not connected");
    }
    
    console.log("Sending message:", content);
    
    const request = create(SendMessageRequestSchema, { content });
    
    try {
      // userIdをヘッダーに含める
      const response = await this.client.sendMessage(request, {
        headers: {
          "x-user-id": this.userId
        }
      });
      
      console.log("Message sent successfully:", response.success);
      
      if (!response.success) {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
  
  async leave(): Promise<void> {
    if (!this.userId) {
      return;
    }
    
    console.log("Leaving chat...");
    
    try {
      const request = create(LeaveRequestSchema, {});
      
      await this.client.leave(request, {
        headers: {
          "x-user-id": this.userId
        }
      });
      
      console.log("Left chat successfully");
    } catch (error) {
      console.error("Error leaving chat:", error);
    } finally {
      this.disconnect();
    }
  }
  
  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.userId = null;
  }
}

export const chatClient = new ChatClient();