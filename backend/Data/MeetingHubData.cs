using System.Collections.Concurrent;

namespace Backend.Data;

public class RoomUser
{
    public required string RoomId { get; set; }
    public required string ConnectionId { get; set; }
    public required string Name { get; set; }
    public required bool MicEnabled { get; set; }
    public required bool VideoEnabled { get; set; }
}

public class MeetingHubData
{
    public ConcurrentDictionary<string, RoomUser> RoomUsers { get; set; } = new();
}