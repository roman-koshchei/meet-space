using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public class ResearchHub : Hub
{
    public async Task<string> CreateRoom()
    {
        var roomId = Guid.NewGuid().ToString();
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        return roomId;
    }

    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.OthersInGroup(roomId).SendAsync("UserJoined", Context.ConnectionId);
    }
}