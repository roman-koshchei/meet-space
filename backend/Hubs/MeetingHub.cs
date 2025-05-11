using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public class MeetingHub : Hub
{
    // SDP - audio/video
    public async Task<List<string>> UserJoining(string userId, string meetingId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, meetingId);

        MeetingHubData.Connections[Context.ConnectionId] = (meetingId, userId);
        MeetingHubData.Users[userId] = (meetingId, Context.ConnectionId);

        await Clients.OthersInGroup(meetingId).SendAsync("AnotherUserJoined", userId);

        return MeetingHubData.Connections.Values
            .Where(t => t.meetingId == meetingId && t.userId != userId)
            .Select(t => t.userId)
            .ToList();
    }
    
    public async Task SdpProcess(string toUserId, SdpDataModel sdpData)
    {
        var fromUserId = MeetingHubData.Connections[Context.ConnectionId].userId;
        var toConnection = MeetingHubData.Users[toUserId].connectionId;

        await Clients.Client(toConnection).SendAsync("sdpProcess", fromUserId, sdpData);
    }
    
    // Chat
    public async Task SendMessage(string meetingId, string message)
    {
        await Clients.Group(meetingId).SendAsync("ReceiveMessage", message);
    }
    
    public async Task GlobalSendMessage(string message)
    {
        await Clients.All.SendAsync("GlobalReceiveMessage", message);
    }
    
    // Rooms
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
    
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (!MeetingHubData.Connections.TryGetValue(Context.ConnectionId, out var data))
            return;

        var (meetingId, userId) = data;

        MeetingHubData.Connections.Remove(Context.ConnectionId);
        MeetingHubData.Users.Remove(userId);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, meetingId);
        await Clients.OthersInGroup(meetingId).SendAsync("UserLeft", userId);

        if (exception != null)
        {
            Console.WriteLine($"{userId} disconnected with error from {meetingId}. Error message: {exception.Message}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}