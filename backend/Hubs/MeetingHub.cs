using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public class MeetingHub : Hub
{
    private readonly MeetingHubData _meetingHubData;
    
    public MeetingHub(MeetingHubData meetingHubData)
    {
        _meetingHubData = meetingHubData;
    }
    
    // SDP - audio/video
    public async Task<List<string>> UserJoining(string userId, string meetingId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, meetingId);

        _meetingHubData.Connections[Context.ConnectionId] = (meetingId, userId);
        _meetingHubData.Users[userId] = (meetingId, Context.ConnectionId);

        await Clients.OthersInGroup(meetingId).SendAsync("AnotherUserJoined", userId);

        return _meetingHubData.Connections.Values
            .Where(t => t.meetingId == meetingId && t.userId != userId)
            .Select(t => t.userId)
            .ToList();
    }
    
    public async Task SdpProcess(string toUserId, SdpDataModel sdpData)
    {
        var fromUserId = _meetingHubData.Users.FirstOrDefault(x => x.Value.connectionId == Context.ConnectionId).Key;
        var toConnection = _meetingHubData.Users.FirstOrDefault(x => x.Key == toUserId).Value.connectionId;
        
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
        if (!_meetingHubData.Connections.TryGetValue(Context.ConnectionId, out var data))
            return;

        var (meetingId, userId) = data;

        _meetingHubData.Connections.TryRemove(Context.ConnectionId, out _);
        _meetingHubData.Users.TryRemove(userId, out _);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, meetingId);
        await Clients.OthersInGroup(meetingId).SendAsync("UserLeft", userId);

        if (exception != null)
        {
            Console.WriteLine($"{userId} disconnected with error from {meetingId}. Error message: {exception.Message}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}