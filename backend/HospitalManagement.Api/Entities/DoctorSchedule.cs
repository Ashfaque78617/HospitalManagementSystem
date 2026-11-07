namespace HospitalManagement.Api.Entities;

public class DoctorSchedule
{
    public int ScheduleId { get; set; }
    public int DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;

    /// <summary>ISO day number: 1 = Monday … 7 = Sunday.</summary>
    public byte DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int SlotDurationMinutes { get; set; }
    public int? MaxAppointments { get; set; }
    public bool IsActive { get; set; } = true;
}
