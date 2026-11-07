using System.ComponentModel.DataAnnotations;

namespace HospitalManagement.Api.Dtos;

public class DoctorRequest
{
    [Required, StringLength(80)] public string FirstName { get; set; } = string.Empty;
    [StringLength(80)] public string? LastName { get; set; }
    [Range(1, int.MaxValue, ErrorMessage = "Select a specialization.")] public int SpecializationId { get; set; }
    public int? UserId { get; set; }
    [StringLength(200)] public string? Qualification { get; set; }
    [RegularExpression(@"^[0-9+\-\s()]{7,20}$", ErrorMessage = "Enter a valid phone number.")] public string? Phone { get; set; }
    [EmailAddress, StringLength(150)] public string? Email { get; set; }
    [Range(0, 1000000, ErrorMessage = "Fee must be between 0 and 1,000,000.")] public decimal ConsultationFee { get; set; }
}

public record DoctorDto(
    int DoctorId, string DoctorCode, string FirstName, string? LastName, string FullName,
    int SpecializationId, string SpecializationName, int? UserId, string? Qualification,
    string? Phone, string? Email, decimal ConsultationFee, bool IsActive);

public record DoctorLookupDto(int DoctorId, string FullName, string SpecializationName, decimal ConsultationFee);

public class ScheduleRequest
{
    [Range(1, 7, ErrorMessage = "Day must be 1 (Monday) to 7 (Sunday).")] public byte DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    [Range(5, 240, ErrorMessage = "Slot length must be 5 to 240 minutes.")] public int SlotDurationMinutes { get; set; } = 20;
    [Range(1, 500)] public int? MaxAppointments { get; set; }
    public bool IsActive { get; set; } = true;
}

public record ScheduleDto(int ScheduleId, byte DayOfWeek, TimeOnly StartTime, TimeOnly EndTime, int SlotDurationMinutes, int? MaxAppointments, bool IsActive);

public record DoctorDetailsDto(DoctorDto Doctor, IReadOnlyList<ScheduleDto> Schedules, IReadOnlyList<AppointmentDto> UpcomingAppointments);
