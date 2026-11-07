using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Entities;

public class AuditLog
{
    public long AuditLogId { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }

    [MaxLength(50)] public string Action { get; set; } = string.Empty;
    [MaxLength(100)] public string? EntityName { get; set; }
    [MaxLength(50)] public string? EntityId { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    public DateTime CreatedDate { get; set; }
    [MaxLength(45)] public string? IpAddress { get; set; }
}
