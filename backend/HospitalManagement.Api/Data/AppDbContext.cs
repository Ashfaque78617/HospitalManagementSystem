using HospitalManagement.Api.Entities;
using HospitalManagement.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUser currentUser) : DbContext(options)
{
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Specialization> Specializations => Set<Specialization>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<DoctorSchedule> DoctorSchedules => Set<DoctorSchedule>();
    public DbSet<AppointmentStatus> AppointmentStatuses => Set<AppointmentStatus>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ---- Unique constraints ----
        mb.Entity<DoctorSchedule>().HasKey(x => x.ScheduleId);
        mb.Entity<SystemSetting>().HasKey(x => x.SettingId);
        mb.Entity<Role>().HasIndex(x => x.RoleName).IsUnique();
        mb.Entity<User>().HasIndex(x => x.Username).IsUnique();
        mb.Entity<Specialization>().HasIndex(x => x.SpecializationName).IsUnique();
        mb.Entity<Patient>().HasIndex(x => x.PatientCode).IsUnique();
        mb.Entity<Doctor>().HasIndex(x => x.DoctorCode).IsUnique();
        mb.Entity<AppointmentStatus>().HasIndex(x => x.StatusName).IsUnique();
        mb.Entity<Appointment>().HasIndex(x => x.AppointmentNo).IsUnique();
        mb.Entity<Invoice>().HasIndex(x => x.InvoiceNo).IsUnique();
        mb.Entity<SystemSetting>().HasIndex(x => x.SettingKey).IsUnique();

        // ---- Performance indexes ----
        mb.Entity<Patient>().HasIndex(x => x.Phone);
        mb.Entity<Patient>().HasIndex(x => new { x.FirstName, x.LastName });
        mb.Entity<Appointment>().HasIndex(x => new { x.DoctorId, x.AppointmentDate, x.StartTime });
        mb.Entity<Appointment>().HasIndex(x => new { x.PatientId, x.AppointmentDate });
        mb.Entity<Invoice>().HasIndex(x => new { x.PatientId, x.InvoiceDate });
        mb.Entity<Payment>().HasIndex(x => new { x.InvoiceId, x.PaymentDate });
        mb.Entity<AuditLog>().HasIndex(x => x.CreatedDate);
        mb.Entity<DoctorSchedule>().HasIndex(x => new { x.DoctorId, x.DayOfWeek });

        // ---- Check constraints ----
        mb.Entity<Doctor>().ToTable(t => t.HasCheckConstraint("CK_Doctors_Fee", "[ConsultationFee] >= 0"));
        mb.Entity<DoctorSchedule>().ToTable(t =>
        {
            t.HasCheckConstraint("CK_DoctorSchedules_Day", "[DayOfWeek] BETWEEN 1 AND 7");
            t.HasCheckConstraint("CK_DoctorSchedules_Time", "[EndTime] > [StartTime]");
            t.HasCheckConstraint("CK_DoctorSchedules_Slot", "[SlotDurationMinutes] > 0");
        });
        mb.Entity<Appointment>().ToTable(t => t.HasCheckConstraint("CK_Appointments_Time", "[EndTime] > [StartTime]"));
        mb.Entity<Invoice>().ToTable(t => t.HasCheckConstraint("CK_Invoices_Amounts",
            "[SubTotal] >= 0 AND [DiscountAmount] >= 0 AND [TaxAmount] >= 0 AND [GrandTotal] >= 0"));
        mb.Entity<InvoiceItem>().ToTable(t =>
        {
            t.HasCheckConstraint("CK_InvoiceItems_Qty", "[Quantity] > 0");
            t.HasCheckConstraint("CK_InvoiceItems_Price", "[UnitPrice] >= 0");
        });
        mb.Entity<Payment>().ToTable(t => t.HasCheckConstraint("CK_Payments_Amount", "[Amount] > 0"));

        // ---- Defaults ----
        mb.Entity<AuditLog>().Property(x => x.CreatedDate).HasDefaultValueSql("SYSUTCDATETIME()");
        mb.Entity<Payment>().Property(x => x.PaymentDate).HasDefaultValueSql("SYSUTCDATETIME()");
        mb.Entity<Invoice>().Property(x => x.InvoiceDate).HasDefaultValueSql("SYSUTCDATETIME()");
        mb.Entity<Invoice>().Property(x => x.Status).HasDefaultValue(InvoiceStatuses.Unpaid);

        // ---- Relationships (no cascading deletes: records are deactivated, not removed) ----
        mb.Entity<Appointment>().HasOne(x => x.Patient).WithMany(p => p.Appointments).HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Appointment>().HasOne(x => x.Doctor).WithMany(d => d.Appointments).HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Appointment>().HasOne(x => x.Status).WithMany().HasForeignKey(x => x.AppointmentStatusId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Doctor>().HasOne(x => x.Specialization).WithMany(s => s.Doctors).HasForeignKey(x => x.SpecializationId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Doctor>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<DoctorSchedule>().HasOne(x => x.Doctor).WithMany(d => d.Schedules).HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<User>().HasOne(x => x.Role).WithMany(r => r.Users).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Invoice>().HasOne(x => x.Patient).WithMany(p => p.Invoices).HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Invoice>().HasOne(x => x.Appointment).WithMany().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<InvoiceItem>().HasOne(x => x.Invoice).WithMany(i => i.Items).HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Payment>().HasOne(x => x.Invoice).WithMany(i => i.Payments).HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<Payment>().HasOne(x => x.ReceivedByUser).WithMany().HasForeignKey(x => x.ReceivedBy).OnDelete(DeleteBehavior.Restrict);
        mb.Entity<AuditLog>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);

        // CreatedBy / ModifiedBy -> Users
        AddAuditForeignKeys<User>(mb);
        AddAuditForeignKeys<Patient>(mb);
        AddAuditForeignKeys<Doctor>(mb);
        AddAuditForeignKeys<Appointment>(mb);
        AddAuditForeignKeys<Invoice>(mb);
        mb.Entity<SystemSetting>().HasOne<User>().WithMany().HasForeignKey(x => x.ModifiedBy).OnDelete(DeleteBehavior.Restrict);
    }

    private static void AddAuditForeignKeys<T>(ModelBuilder mb) where T : class
    {
        mb.Entity<T>().HasOne<User>().WithMany().HasForeignKey("CreatedBy").OnDelete(DeleteBehavior.Restrict);
        mb.Entity<T>().HasOne<User>().WithMany().HasForeignKey("ModifiedBy").OnDelete(DeleteBehavior.Restrict);
    }

    /// <summary>Stamps audit columns automatically for every IAuditable entity.</summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var userId = currentUser.UserId;

        foreach (var entry in ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedDate = now;
                entry.Entity.CreatedBy ??= userId;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.ModifiedDate = now;
                entry.Entity.ModifiedBy = userId;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
