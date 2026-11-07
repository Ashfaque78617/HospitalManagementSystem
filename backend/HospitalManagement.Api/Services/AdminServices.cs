using System.Text.RegularExpressions;
using HospitalManagement.Api.Common;
using HospitalManagement.Api.Data;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Services;

public class UserService(AppDbContext db, IAuditService audit, ICurrentUser currentUser)
{
    private static readonly Regex PasswordRule = new(@"^(?=.*[A-Za-z])(?=.*\d).{8,100}$");

    public async Task<PagedResult<UserDto>> ListAsync(string? search, int? roleId, bool? isActive, int page, int pageSize)
    {
        var q = db.Users.AsNoTracking().AsQueryable();
        if (roleId.HasValue) q = q.Where(u => u.RoleId == roleId);
        if (isActive.HasValue) q = q.Where(u => u.IsActive == isActive);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(u => u.Username.Contains(s) || u.FullName.Contains(s) || (u.Email ?? "").Contains(s));
        }
        return await q.OrderBy(u => u.FullName)
            .Select(u => new UserDto(u.UserId, u.Username, u.FullName, u.Email, u.Phone, u.RoleId, u.Role.RoleName, u.IsActive, u.CreatedDate))
            .ToPagedAsync(page, pageSize);
    }

    public async Task<UserDto> CreateAsync(UserRequest r)
    {
        EnsurePasswordStrong(r.Password);
        await EnsureUsernameFreeAsync(r.Username, 0);
        await EnsureRoleAsync(r.RoleId);

        var user = new User
        {
            Username = r.Username.Trim(), PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.Password!),
            FullName = r.FullName.Trim(), Email = Clean(r.Email), Phone = Clean(r.Phone), RoleId = r.RoleId
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        await audit.LogAsync("Create", nameof(User), user.UserId, $"Created user '{user.Username}'.");
        return await GetAsync(user.UserId);
    }

    public async Task<UserDto> UpdateAsync(int id, UserRequest r)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == id) ?? throw new NotFoundException($"User #{id} was not found.");
        await EnsureUsernameFreeAsync(r.Username, id);
        await EnsureRoleAsync(r.RoleId);
        if (id == currentUser.UserId && r.RoleId != user.RoleId)
            throw new BusinessRuleException("You cannot change your own role.");

        user.Username = r.Username.Trim();
        user.FullName = r.FullName.Trim();
        user.Email = Clean(r.Email);
        user.Phone = Clean(r.Phone);
        user.RoleId = r.RoleId;
        await db.SaveChangesAsync();
        await audit.LogAsync("Update", nameof(User), id, $"Updated user '{user.Username}'.");
        return await GetAsync(id);
    }

    public async Task SetActiveAsync(int id, bool isActive)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == id) ?? throw new NotFoundException($"User #{id} was not found.");
        if (!isActive && id == currentUser.UserId) throw new BusinessRuleException("You cannot deactivate your own account.");
        user.IsActive = isActive;
        await db.SaveChangesAsync();
        await audit.LogAsync(isActive ? "Activate" : "Deactivate", nameof(User), id, $"{(isActive ? "Activated" : "Deactivated")} user '{user.Username}'.");
    }

    public async Task ResetPasswordAsync(int id, string newPassword)
    {
        EnsurePasswordStrong(newPassword);
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == id) ?? throw new NotFoundException($"User #{id} was not found.");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await db.SaveChangesAsync();
        await audit.LogAsync("PasswordReset", nameof(User), id, $"Password reset for '{user.Username}'.");
    }

    private async Task<UserDto> GetAsync(int id) =>
        await db.Users.AsNoTracking().Where(u => u.UserId == id)
            .Select(u => new UserDto(u.UserId, u.Username, u.FullName, u.Email, u.Phone, u.RoleId, u.Role.RoleName, u.IsActive, u.CreatedDate))
            .FirstAsync();

    private static void EnsurePasswordStrong(string? password)
    {
        if (string.IsNullOrEmpty(password) || !PasswordRule.IsMatch(password))
            throw new BusinessRuleException("Password must be at least 8 characters and contain letters and numbers.");
    }

    private async Task EnsureUsernameFreeAsync(string username, int excludeId)
    {
        var name = username.Trim();
        if (await db.Users.AnyAsync(u => u.Username == name && u.UserId != excludeId))
            throw new BusinessRuleException("That username is already taken.");
    }

    private async Task EnsureRoleAsync(int roleId)
    {
        if (!await db.Roles.AnyAsync(r => r.RoleId == roleId)) throw new BusinessRuleException("Select a valid role.");
    }

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();
}

/// <summary>Reference data: roles, specializations and appointment statuses.</summary>
public class LookupService(AppDbContext db, IAuditService audit)
{
    public async Task<IReadOnlyList<RoleDto>> GetRolesAsync() =>
        await db.Roles.AsNoTracking().OrderBy(r => r.RoleId).Select(r => new RoleDto(r.RoleId, r.RoleName, r.Users.Count)).ToListAsync();

    public async Task<IReadOnlyList<SpecializationDto>> GetSpecializationsAsync(bool activeOnly) =>
        await db.Specializations.AsNoTracking().Where(s => !activeOnly || s.IsActive).OrderBy(s => s.SpecializationName)
            .Select(s => new SpecializationDto(s.SpecializationId, s.SpecializationName, s.Description, s.IsActive, s.Doctors.Count)).ToListAsync();

    public async Task<SpecializationDto> SaveSpecializationAsync(int? id, SpecializationRequest r)
    {
        var name = r.SpecializationName.Trim();
        if (await db.Specializations.AnyAsync(s => s.SpecializationName == name && s.SpecializationId != (id ?? 0)))
            throw new BusinessRuleException("A specialization with this name already exists.");

        Specialization entity;
        if (id.HasValue)
        {
            entity = await db.Specializations.FirstOrDefaultAsync(s => s.SpecializationId == id) ?? throw new NotFoundException("Specialization not found.");
            if (!r.IsActive && entity.IsActive && await db.Doctors.AnyAsync(d => d.SpecializationId == id && d.IsActive))
                throw new BusinessRuleException("Active doctors still use this specialization. Reassign them first.");
        }
        else
        {
            entity = new Specialization();
            db.Specializations.Add(entity);
        }
        entity.SpecializationName = name;
        entity.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        entity.IsActive = r.IsActive;
        await db.SaveChangesAsync();
        await audit.LogAsync(id.HasValue ? "Update" : "Create", nameof(Specialization), entity.SpecializationId, $"Saved specialization '{name}'.");
        return (await GetSpecializationsAsync(false)).First(s => s.SpecializationId == entity.SpecializationId);
    }

    public async Task<IReadOnlyList<AppointmentStatusDto>> GetStatusesAsync() =>
        await db.AppointmentStatuses.AsNoTracking().OrderBy(s => s.AppointmentStatusId)
            .Select(s => new AppointmentStatusDto(s.AppointmentStatusId, s.StatusName, s.IsActive)).ToListAsync();

    public async Task<AppointmentStatusDto> SaveStatusAsync(int? id, AppointmentStatusRequest r)
    {
        var name = r.StatusName.Trim();
        if (await db.AppointmentStatuses.AnyAsync(s => s.StatusName == name && s.AppointmentStatusId != (id ?? 0)))
            throw new BusinessRuleException("A status with this name already exists.");

        AppointmentStatus entity;
        if (id.HasValue)
        {
            entity = await db.AppointmentStatuses.FirstOrDefaultAsync(s => s.AppointmentStatusId == id) ?? throw new NotFoundException("Status not found.");
            var builtIn = new[] { StatusNames.Scheduled, StatusNames.CheckedIn, StatusNames.Waiting, StatusNames.InConsultation, StatusNames.Completed, StatusNames.Cancelled, StatusNames.NoShow };
            if (builtIn.Contains(entity.StatusName) && (entity.StatusName != name || !r.IsActive))
                throw new BusinessRuleException("Built-in statuses drive the appointment workflow and cannot be renamed or deactivated.");
        }
        else
        {
            entity = new AppointmentStatus();
            db.AppointmentStatuses.Add(entity);
        }
        entity.StatusName = name;
        entity.IsActive = r.IsActive;
        await db.SaveChangesAsync();
        await audit.LogAsync(id.HasValue ? "Update" : "Create", nameof(AppointmentStatus), entity.AppointmentStatusId, $"Saved status '{name}'.");
        return new AppointmentStatusDto(entity.AppointmentStatusId, entity.StatusName, entity.IsActive);
    }
}

public class SettingsService(AppDbContext db, IAuditService audit, ICurrentUser currentUser)
{
    public async Task<IReadOnlyList<SettingDto>> GetAllAsync() =>
        await db.SystemSettings.AsNoTracking().OrderBy(s => s.SettingId)
            .Select(s => new SettingDto(s.SettingKey, s.SettingValue, s.Description)).ToListAsync();

    public async Task<IReadOnlyList<SettingDto>> UpdateAsync(Dictionary<string, string?> values)
    {
        var keys = values.Keys.ToList();
        var settings = await db.SystemSettings.Where(s => keys.Contains(s.SettingKey)).ToListAsync();
        foreach (var s in settings)
        {
            var v = values[s.SettingKey]?.Trim();
            if (v is { Length: > 500 }) throw new BusinessRuleException($"'{s.SettingKey}' is too long (max 500 characters).");
            if (s.SettingKey == "HospitalName" && string.IsNullOrWhiteSpace(v)) throw new BusinessRuleException("Hospital name is required.");
            s.SettingValue = v;
            s.ModifiedDate = DateTime.UtcNow;
            s.ModifiedBy = currentUser.UserId;
        }
        await db.SaveChangesAsync();
        await audit.LogAsync("Update", nameof(SystemSetting), null, $"Updated settings: {string.Join(", ", settings.Select(s => s.SettingKey))}.");
        return await GetAllAsync();
    }
}
