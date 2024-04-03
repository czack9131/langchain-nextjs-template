import { ChatBot } from "@/lib/ChatBot";
import React, { PropsWithChildren } from "react";

type ChatBotContextType = {
  chatBot: ChatBot;
  setChatBot: React.Dispatch<React.SetStateAction<ChatBot>>;
};
const ChatContext = React.createContext<ChatBotContextType>({
  chatBot: new ChatBot(),
  setChatBot(value: React.SetStateAction<ChatBot>) {
    throw new Error("Function not implemented.");
  }
});

export const ChatContextProvider: React.FC<PropsWithChildren> = (props) => {
  const { children } = props;

  const [chatBot, setChatBot] = React.useState<ChatBot>(new ChatBot());

  return (
    <ChatContext.Provider value={{ chatBot, setChatBot }}>
      {children}
    </ChatContext.Provider>
  );
};

export function useChatBot(sessionId?: string) {
  const context = React.useContext(ChatContext);

  if (!context) throw Error("useChatBot must be wrapped in a <ChatBotProvider/>");

  React.useEffect(() => {
    context.setChatBot(new ChatBot(sessionId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return context.chatBot;
}
