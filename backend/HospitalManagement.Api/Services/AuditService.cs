using HospitalManagement.Api.Common;
using HospitalManagement.Api.Data;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Services;

public interface IAuditService
{
    Task LogAsync(string action, string? entityName = null, object? entityId = null, string? description = null, int? userId = null);
    Task<PagedResult<AuditLogDto>> QueryAsync(string? search, string? action, DateOnly? from, DateOnly? to, int page, int pageSize);
    Task<IReadOnlyList<string>> GetActionsAsync();
}

public class AuditService(AppDbContext db, ICurrentUser currentUser) : IAuditService
{
    public async Task LogAsync(string action, string? entityName = null, object? entityId = null, string? description = null, int? userId = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            UserId = userId ?? currentUser.UserId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId?.ToString(),
            Description = description is { Length: > 1000 } ? description[..1000] : description,
            CreatedDate = DateTime.UtcNow,
            IpAddress = currentUser.IpAddress
        });
        await db.SaveChangesAsync();
    }

    public async Task<PagedResult<AuditLogDto>> QueryAsync(string? search, string? action, DateOnly? from, DateOnly? to, int page, int pageSize)
    {
        var q = db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(action)) q = q.Where(l => l.Action == action);
        if (from.HasValue) { var f = from.Value.ToDateTime(TimeOnly.MinValue); q = q.Where(l => l.CreatedDate >= f); }
        if (to.HasValue) { var t = to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue); q = q.Where(l => l.CreatedDate < t); }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(l => (l.Description ?? "").Contains(s) || (l.EntityName ?? "").Contains(s) ||
                             (l.EntityId ?? "").Contains(s) || (l.User != null && l.User.Username.Contains(s)));
        }
        return await q.OrderByDescending(l => l.AuditLogId)
            .Select(l => new AuditLogDto(l.AuditLogId, l.UserId, l.User != null ? l.User.FullName : null, l.Action,
                l.EntityName, l.EntityId, l.Description, l.CreatedDate, l.IpAddress))
            .ToPagedAsync(page, pageSize);
    }

    public async Task<IReadOnlyList<string>> GetActionsAsync() =>
        await db.AuditLogs.AsNoTracking().Select(l => l.Action).Distinct().OrderBy(a => a).ToListAsync();
}
