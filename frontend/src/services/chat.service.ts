import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { create } from "@bufbuild/protobuf";
import { ChatService } from "../gen/proto/chat/v1/chat_pb";
import { 
  type ChatMessage,
  ChatMessageSchema,
  type ChatEvent,
  JoinRequestSchema,
  SendMessageRequestSchema,
  LeaveRequestSchema 
} from "../gen/proto/chat/v1/chat_pb";

interface StreamController {
  writer: WritableStreamDefaultWriter<ChatMessage>;
  reader: AsyncIterator<ChatEvent>;
  abortController: AbortController;
}

export class ChatClient {
  private client;
  private streamController: StreamController | null = null;
  
  constructor() {
    const transport = createConnectTransport({
      baseUrl: "",
    });
    this.client = createClient(ChatService, transport);
  }
  
  async *connect(username: string): AsyncGenerator<ChatEvent> {
    const abortController = new AbortController();
    const messageQueue: ChatMessage[] = [];
    let resolveNext: ((value: IteratorResult<ChatMessage>) => void) | null = null;
    
    // Create an AsyncIterable from a queue
    const requestIterable: AsyncIterable<ChatMessage> = {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<ChatMessage>> {
            if (messageQueue.length > 0) {
              return { value: messageQueue.shift()!, done: false };
            }
            return new Promise<IteratorResult<ChatMessage>>((resolve) => {
              resolveNext = resolve;
            });
          },
          async return(): Promise<IteratorResult<ChatMessage>> {
            return { done: true, value: undefined };
          }
        };
      }
    };
    
    // Create a writer that adds messages to the queue
    const writer: WritableStreamDefaultWriter<ChatMessage> = {
      write: async (chunk: ChatMessage) => {
        if (resolveNext) {
          resolveNext({ value: chunk, done: false });
          resolveNext = null;
        } else {
          messageQueue.push(chunk);
        }
      },
      close: async () => {
        if (resolveNext) {
          resolveNext({ done: true, value: undefined });
          resolveNext = null;
        }
      },
      abort: async (_reason?: any) => {
        if (resolveNext) {
          resolveNext({ done: true, value: undefined });
          resolveNext = null;
        }
      },
      get closed() {
        return Promise.resolve();
      },
      get ready() {
        return Promise.resolve();
      },
      get desiredSize() {
        return null;
      },
      releaseLock: () => {}
    };
    
    const responseStream = this.client.chat(
      requestIterable,
      { signal: abortController.signal }
    );
    
    this.streamController = {
      writer,
      reader: responseStream[Symbol.asyncIterator](),
      abortController
    };
    
    const joinMessage = create(ChatMessageSchema, {
      message: {
        case: "join",
        value: create(JoinRequestSchema, { username })
      }
    });
    await this.streamController.writer.write(joinMessage);
    
    try {
      for await (const event of responseStream) {
        yield event;
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        throw error;
      }
    }
  }
  
  async sendMessage(content: string): Promise<void> {
    if (!this.streamController) throw new Error("Not connected");
    
    const sendMessage = create(ChatMessageSchema, {
      message: {
        case: "sendMessage",
        value: create(SendMessageRequestSchema, { content })
      }
    });
    
    await this.streamController.writer.write(sendMessage);
  }
  
  async disconnect(): Promise<void> {
    if (this.streamController) {
      try {
        const leaveMessage = create(ChatMessageSchema, {
          message: {
            case: "leave",
            value: create(LeaveRequestSchema, {})
          }
        });
        
        await this.streamController.writer.write(leaveMessage);
        await this.streamController.writer.close();
      } catch (error) {
        console.error("Error during disconnect:", error);
      } finally {
        this.streamController.abortController.abort();
        this.streamController = null;
      }
    }
  }
}

export const chatClient = new ChatClient();