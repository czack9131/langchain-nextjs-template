import { PropsWithChildren } from "react";

type MessageProps = PropsWithChildren;

export const UserMessage: React.FC<MessageProps> = (props) => {
  const { children } = props;
  return (
    <div className="m-2 p-3 rounded-lg bg-blue-500 text-white self-end">
      {children}
    </div>
  );
};

export const SystemMessage: React.FC<MessageProps> = (props) => {
  const { children } = props;
  return (
    <div className="m-2 p-3 rounded-lg bg-gray-200 text-gray-800">{children}</div>
  );
};
