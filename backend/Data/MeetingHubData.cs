using System.Collections.Concurrent;

namespace Backend.Data;

public class MeetingHubData
{
    public ConcurrentDictionary<string, (string meetingId, string userId)> Connections { get; set; } = new();

    public ConcurrentDictionary<string, (string meetingId, string connectionId)> Users { get; set; } = new();
}