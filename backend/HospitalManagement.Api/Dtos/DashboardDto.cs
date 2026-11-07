namespace HospitalManagement.Api.Dtos;

public record CollectionPointDto(string Label, decimal Amount);
public record StatusCountDto(string Status, int Count);

public record DashboardDto(
    int TotalPatients, int TotalDoctors, int TodaysAppointments, int PendingAppointments,
    int TodaysInvoices, decimal TodaysCollections, decimal OutstandingAmount, bool ShowBilling,
    IReadOnlyList<AppointmentDto> TodaysSchedule,
    IReadOnlyList<CollectionPointDto> Collections,
    IReadOnlyList<StatusCountDto> AppointmentsByStatus);
