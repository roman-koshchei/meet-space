using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public class ChatHub : Hub
{
    public async Task CreateRoom()
    {
        var roomId = Guid.NewGuid().ToString();

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        await Clients.Group(roomId).SendAsync("Connect", roomId);
    }

    public async Task ConnectToRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        await Clients.Group(roomId).SendAsync("NewUserInRoom");
    }

    public async Task SendMessage(string roomId, string message)
    {
        await Clients.Group(roomId).SendAsync("ReceiveMessage", message);
    }

    public async Task GlobalSendMessage(string message)
    {
        await Clients.All.SendAsync("GlobalReceiveMessage", message);
    }
}