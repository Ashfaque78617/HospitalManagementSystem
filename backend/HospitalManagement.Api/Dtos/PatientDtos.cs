using System.ComponentModel.DataAnnotations;
using HospitalManagement.Api.Entities;

namespace HospitalManagement.Api.Dtos;

public class PatientRequest
{
    [Required, StringLength(80)] public string FirstName { get; set; } = string.Empty;
    [StringLength(80)] public string? LastName { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    [RegularExpression("^(Male|Female|Other)$", ErrorMessage = "Gender must be Male, Female or Other.")]
    public string? Gender { get; set; }
    [RegularExpression(@"^(A|B|AB|O)[+-]$", ErrorMessage = "Blood group must look like A+, O-, AB+ ...")]
    public string? BloodGroup { get; set; }
    [Required, RegularExpression(@"^[0-9+\-\s()]{7,20}$", ErrorMessage = "Enter a valid phone number.")]
    public string Phone { get; set; } = string.Empty;
    [EmailAddress, StringLength(150)] public string? Email { get; set; }
    [StringLength(500)] public string? Address { get; set; }
    [StringLength(150)] public string? EmergencyContactName { get; set; }
    [RegularExpression(@"^[0-9+\-\s()]{7,20}$", ErrorMessage = "Enter a valid emergency phone number.")]
    public string? EmergencyContactPhone { get; set; }
}

public class ActiveStatusRequest
{
    public bool IsActive { get; set; }
}

public record PatientDto(
    int PatientId, string PatientCode, string FirstName, string? LastName, string FullName,
    DateOnly? DateOfBirth, int? Age, string? Gender, string? BloodGroup, string Phone, string? Email,
    string? Address, string? EmergencyContactName, string? EmergencyContactPhone,
    bool IsActive, DateTime CreatedDate)
{
    public static PatientDto From(Patient p)
    {
        int? age = null;
        if (p.DateOfBirth is { } dob)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            age = today.Year - dob.Year - (today < dob.AddYears(today.Year - dob.Year) ? 1 : 0);
        }
        return new PatientDto(p.PatientId, p.PatientCode, p.FirstName, p.LastName,
            $"{p.FirstName} {p.LastName}".Trim(), p.DateOfBirth, age, p.Gender, p.BloodGroup, p.Phone, p.Email,
            p.Address, p.EmergencyContactName, p.EmergencyContactPhone, p.IsActive, p.CreatedDate);
    }
}

public record PatientLookupDto(int PatientId, string PatientCode, string FullName, string Phone);
public record PaymentSummaryDto(decimal TotalBilled, decimal TotalPaid, decimal Outstanding);

public record PatientDetailsDto(
    PatientDto Patient,
    IReadOnlyList<AppointmentDto> Appointments,
    IReadOnlyList<InvoiceListDto> Invoices,
    PaymentSummaryDto Summary);

public record HistoryItemDto(DateTime Date, string Type, string Title, string? Description, decimal? Amount, string? Status, int ReferenceId);
