using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Entities;

public class AppointmentStatus
{
    public int AppointmentStatusId { get; set; }
    [MaxLength(50)] public string StatusName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

/// <summary>Names of the built-in statuses the workflow depends on.</summary>
public static class StatusNames
{
    public const string Scheduled = "Scheduled";
    public const string CheckedIn = "Checked-In";
    public const string Waiting = "Waiting";
    public const string InConsultation = "In Consultation";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string NoShow = "No Show";

    /// <summary>Statuses that free the time slot (they never block new bookings).</summary>
    public static readonly string[] Inactive = [Completed, Cancelled, NoShow];
}
