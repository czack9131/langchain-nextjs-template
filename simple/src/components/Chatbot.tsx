import { SystemMessage, UserMessage } from "./Messages";

const Chatbot = () => {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none bg-gray-800 text-white p-4">Chatbot</div>
      <div className="flex-1 p-2 overflow-y-scroll">
        <SystemMessage>Hello! How can I help you today?</SystemMessage>
        <UserMessage> I need assistance with my order.</UserMessage>
      </div>
      <div className="flex-none p-2">
        <input
          type="text"
          placeholder="Type your message..."
          className="w-full p-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
};

export default Chatbot;
