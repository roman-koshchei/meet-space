namespace Backend.Data;

public static class MeetingHubData
{
    public static IDictionary<string, (string meetingId, string userId)> Connections { get; set; } = new Dictionary<string, (string, string)>();

    public static IDictionary<string, (string meetingId, string connectionId)> Users { get; set; } = new Dictionary<string, (string, string)>();
}