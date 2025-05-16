type Props = {
  roomId: string;
  username: string;
};

export default function Header({ roomId, username }: Props) {
  return (
    <div className="bg-white shadow p-4 flex justify-between items-center">
      <div>
        <h1 className="">Room ID: {roomId}</h1>
      </div>
      <div className="flex items-center">
        <span className=" text-gray-600">{username}</span>
      </div>
    </div>
  );
}
