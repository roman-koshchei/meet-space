import {Button} from "~/components/ui/button";
import {useNavigate} from "react-router";

type Props = {
    roomId: string;
    username: string;
}

export default function Header({ roomId, username }: Props) {
    const navigate = useNavigate();

    const handleBackToHome = () => {
        navigate("/");
    };

    return (
        <div className="bg-white shadow p-4 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold">Meet Space</h1>
                <p className="text-sm text-gray-600">Room ID: {roomId}</p>
            </div>
            <div className="flex items-center">
                <span className="mr-4 text-sm text-gray-600">{username}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToHome}
                    className="mr-2"
                >
                    Back to Home
                </Button>
            </div>
        </div>
    )
}