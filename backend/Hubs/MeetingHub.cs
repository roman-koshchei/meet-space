using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

public class MeetingHub(MeetingHubData meetingHubData) : Hub
{
    public async Task SendTo(string connectionId, string data)
    {
        await Clients.Client(connectionId).SendAsync("ReceiveFrom", Context.ConnectionId, data);
    }

    public async Task SendOffer(string connectionId, string sdpData)
    {
        Console.WriteLine($"SendOffer {connectionId} {sdpData}");
        await Clients.Client(connectionId).SendAsync("ReceiveOffer", Context.ConnectionId, sdpData);
    }

    public async Task SendAnswer(string connectionId, string sdpData)
    {
        Console.WriteLine($"SendAnswer {connectionId} {sdpData}");
        await Clients.Client(connectionId).SendAsync("ReceiveOffer", Context.ConnectionId, sdpData);
    }

    public async Task SendIceCandidate(string connectionId, string candidateData)
    {
        Console.WriteLine($"SendIceCandidate {connectionId} {candidateData}");
        await Clients.Client(connectionId).SendAsync("ReceiveIceCandidate", Context.ConnectionId, candidateData);
    }

    // Chat
    public async Task SendMessage(string roomId, string message)
    {
        await Clients.OthersInGroup(roomId).SendAsync("ReceiveMessage", message);
    }

    // Rooms
    public async Task<RoomUser[]> ConnectToRoom(string roomId, string name)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.OthersInGroup(roomId).SendAsync("UserJoinedRoom", Context.ConnectionId, name);

        var othersUsers = meetingHubData.RoomUsers.Values.Where(x => x.RoomId == roomId).ToArray();

        if (!meetingHubData.RoomUsers.ContainsKey(Context.ConnectionId))
        {
            meetingHubData.RoomUsers.TryAdd(Context.ConnectionId, new RoomUser
            {
                ConnectionId = Context.ConnectionId,
                Name = name,
                RoomId = roomId
            });
        }

        return othersUsers;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"OnDisconnectedAsync {Context.ConnectionId}");
        if (meetingHubData.RoomUsers.TryRemove(Context.ConnectionId, out var userRoom))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userRoom.RoomId);
            await Clients.OthersInGroup(userRoom.RoomId).SendAsync("UserLeft", Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}