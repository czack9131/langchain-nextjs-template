import { BaseListChatMessageHistory } from "@langchain/core/chat_history";
import {
  BaseMessage,
  mapChatMessagesToStoredMessages
} from "@langchain/core/messages";
import { ChatMessage } from "langchain/schema";
import prisma from "./prisma";

// export interface CustomChatMessageHistoryInput {
//   sessionId: string;
// }

// export class CustomChatMessageHistory extends BaseListChatMessageHistory {
//   lc_namespace = ["langchain", "stores", "message"];
//   private data: Chat | null = null;
//   sessionId: string;

//   constructor(fields: CustomChatMessageHistoryInput) {
//     super(fields);
//     this.sessionId = fields.sessionId;
//     prisma.chat
//       .upsert({
//         where: { sessionId: fields.sessionId },
//         update: {},
//         create: { sessionId: fields.sessionId }
//       })
//       .then((d) => (this.data = d));
//   }

//   override async getMessages(): Promise<BaseMessage[]> {
//     const chatMessages = await prisma.chatMessage.findMany({
//       where: {
//         chat: {
//           sessionId: this.sessionId
//         }
//       },
//       orderBy: {
//         createdAt: "asc"
//       },
//       include: {
//         user: {
//           select: {
//             userType: true
//           }
//         }
//       }
//     });

//     return chatMessages.map((m) => {
//       const { user, content, ...other } = m;

//       switch (user.userType) {
//         case "SYSTEM":
//           return new SystemMessage(content, other);
//         case "AI":
//           return new AIMessage(content, other);
//         case "HUMAN":
//           return new HumanMessage(content, other);
//       }
//     });
//   }

//   override async addMessage(message: BaseMessage): Promise<void> {
//     const serializedMessage = mapChatMessagesToStoredMessages([message])[0];

//     await prisma.chatMessage.create({
//       data: {
//         user: {
//           connect: {
//             id: serializedMessage.data.name,
//             userType: serializedMessage.data.role as UserType | undefined
//           }
//         },
//         content: serializedMessage.data.content,
//         chat: {
//           connect: {
//             sessionId: this.sessionId
//           }
//         }
//       }
//     });
//   }

//   override async addMessages(messages: BaseMessage[]): Promise<void> {
//     const serializedMessages = mapChatMessagesToStoredMessages(messages);

//     if (!this.data) throw Error("Internal error. ChatHistory is not initialized.");

//     await prisma.chatMessage.createMany({
//       data: serializedMessages.map((m) => {
//         if (!m.data.name)
//           throw Error(
//             `Property 'name' is not defined in chat ${JSON.stringify(m, null, 2)}`
//           );

//         return {
//           chatId: this.data!.id,
//           content: m.data.content,
//           userId: m.data.name
//         };
//       })
//     });
//   }

//   override async clear(): Promise<void> {
//     await prisma.chatMessage.deleteMany({
//       where: {
//         chat: {
//           sessionId: this.sessionId
//         }
//       }
//     });
//   }
// }

export type PrismaChatMessageHistoryInput = { sessionId: string };
export class PrismaChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message"];
  private sessionId: string;

  constructor(fields: PrismaChatMessageHistoryInput) {
    super(fields);
    this.sessionId = fields.sessionId;

    prisma.chat.create({ data: { sessionId: fields.sessionId } });
  }

  override async getMessages(): Promise<BaseMessage[]> {
    const chatMessages = await prisma.chatMessage.findMany({
      where: { chat: { sessionId: this.sessionId } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { userType: true } } }
    });

    return chatMessages.map(
      (m) =>
        new ChatMessage({
          content: m.content,
          role: m.user.userType,
          name: m.userId
        })
    );
  }
  override async addMessage(message: BaseMessage): Promise<void> {
    const serializedMessage = mapChatMessagesToStoredMessages([message])[0];

    await prisma.chatMessage.create({
      data: {
        user: { connect: { id: serializedMessage.data.name } },
        content: serializedMessage.data.content,
        chat: { connect: { sessionId: this.sessionId } }
      }
    });
  }
  override async clear(): Promise<void> {
    await prisma.chatMessage.deleteMany({
      where: {
        chat: {
          sessionId: this.sessionId
        }
      }
    });
  }
  override async addMessages(messages: BaseMessage[]): Promise<void> {
    messages.forEach(this.addMessage);
  }
}
