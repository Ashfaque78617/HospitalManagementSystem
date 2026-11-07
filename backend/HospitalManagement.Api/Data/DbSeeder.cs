using HospitalManagement.Api.Common;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace HospitalManagement.Api.Data;

/// <summary>Seeds master data and a small demo data set. Safe to run on every start-up.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Roles.AnyAsync()) return; // already seeded

        // ---- Master data ----
        db.Roles.AddRange(
            new Role { RoleName = AppRoles.Admin },
            new Role { RoleName = AppRoles.Receptionist },
            new Role { RoleName = AppRoles.BillingStaff },
            new Role { RoleName = AppRoles.Doctor });

        foreach (var s in new[] { StatusNames.Scheduled, StatusNames.CheckedIn, StatusNames.Waiting,
                     StatusNames.InConsultation, StatusNames.Completed, StatusNames.Cancelled, StatusNames.NoShow })
            db.AppointmentStatuses.Add(new AppointmentStatus { StatusName = s });

        var specs = new (string Name, string Desc)[]
        {
            ("General Medicine", "Primary care and general health concerns"),
            ("Cardiology", "Heart and cardiovascular system"),
            ("Pediatrics", "Health care for infants, children and teens"),
            ("Orthopedics", "Bones, joints and muscles"),
            ("Dermatology", "Skin, hair and nails"),
            ("Gynecology", "Women's reproductive health"),
        };
        foreach (var (name, desc) in specs)
            db.Specializations.Add(new Specialization { SpecializationName = name, Description = desc });

        var settings = new (string Key, string Value, string Desc)[]
        {
            ("HospitalName", "Riverside General Hospital", "Name printed on invoices and the app header"),
            ("HospitalPhone", "+1 555 010 4400", "Main reception phone number"),
            ("HospitalEmail", "care@riverside-hospital.example", "Public contact email"),
            ("HospitalAddress", "120 Riverside Avenue, Springfield", "Address printed on invoices"),
            ("InvoicePrefix", "INV", "Prefix for generated invoice numbers"),
            ("CurrencySymbol", "$", "Currency symbol shown with amounts"),
            ("InvoiceFooter", "Thank you for trusting us with your care.", "Footer text on printed invoices"),
        };
        foreach (var (k, v, d) in settings)
            db.SystemSettings.Add(new SystemSetting { SettingKey = k, SettingValue = v, Description = d });

        await db.SaveChangesAsync();

        // ---- Users (demo passwords - change immediately in production) ----
        var roles = await db.Roles.ToDictionaryAsync(r => r.RoleName, r => r.RoleId);
        User NewUser(string username, string password, string fullName, string role, string email) => new()
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            FullName = fullName,
            Email = email,
            RoleId = roles[role],
            IsActive = true
        };

        var doctorUsers = new[]
        {
            NewUser("dr.sharma", "Doctor@123", "Dr. Anita Sharma", AppRoles.Doctor, "anita.sharma@riverside-hospital.example"),
            NewUser("dr.kumar", "Doctor@123", "Dr. Rohan Kumar", AppRoles.Doctor, "rohan.kumar@riverside-hospital.example"),
        };
        db.Users.AddRange(
            NewUser("admin", "Admin@123", "System Administrator", AppRoles.Admin, "admin@riverside-hospital.example"),
            NewUser("reception", "Recep@123", "Maya Reception", AppRoles.Receptionist, "reception@riverside-hospital.example"),
            NewUser("billing", "Billing@123", "Ben Billing", AppRoles.BillingStaff, "billing@riverside-hospital.example"));
        db.Users.AddRange(doctorUsers);
        await db.SaveChangesAsync();

        // ---- Doctors + weekly schedules (Mon-Sat) ----
        var specIds = await db.Specializations.ToDictionaryAsync(s => s.SpecializationName, s => s.SpecializationId);
        var doctors = new[]
        {
            new Doctor { DoctorCode = "DOC-0001", FirstName = "Anita", LastName = "Sharma", SpecializationId = specIds["General Medicine"], Qualification = "MBBS, MD", Phone = "+1 555 010 1001", Email = "anita.sharma@riverside-hospital.example", ConsultationFee = 60, UserId = doctorUsers[0].UserId },
            new Doctor { DoctorCode = "DOC-0002", FirstName = "Rohan", LastName = "Kumar", SpecializationId = specIds["Cardiology"], Qualification = "MBBS, DM Cardiology", Phone = "+1 555 010 1002", Email = "rohan.kumar@riverside-hospital.example", ConsultationFee = 120, UserId = doctorUsers[1].UserId },
            new Doctor { DoctorCode = "DOC-0003", FirstName = "Priya", LastName = "Menon", SpecializationId = specIds["Pediatrics"], Qualification = "MBBS, DCH", Phone = "+1 555 010 1003", ConsultationFee = 70 },
            new Doctor { DoctorCode = "DOC-0004", FirstName = "Daniel", LastName = "Okafor", SpecializationId = specIds["Orthopedics"], Qualification = "MBBS, MS Ortho", Phone = "+1 555 010 1004", ConsultationFee = 100 },
            new Doctor { DoctorCode = "DOC-0005", FirstName = "Sofia", LastName = "Alvarez", SpecializationId = specIds["Dermatology"], Qualification = "MBBS, MD Dermatology", Phone = "+1 555 010 1005", ConsultationFee = 85 },
        };
        db.Doctors.AddRange(doctors);
        await db.SaveChangesAsync();

        foreach (var d in doctors)
            for (byte day = 1; day <= 6; day++)
            {
                db.DoctorSchedules.Add(new DoctorSchedule { DoctorId = d.DoctorId, DayOfWeek = day, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(13, 0), SlotDurationMinutes = 20, MaxAppointments = 12 });
                if (day <= 5)
                    db.DoctorSchedules.Add(new DoctorSchedule { DoctorId = d.DoctorId, DayOfWeek = day, StartTime = new TimeOnly(15, 0), EndTime = new TimeOnly(18, 0), SlotDurationMinutes = 20, MaxAppointments = 9 });
            }

        // ---- Patients ----
        var patients = new[]
        {
            new Patient { PatientCode = "TMP1", FirstName = "Liam", LastName = "Carter", DateOfBirth = new DateOnly(1988, 4, 12), Gender = "Male", BloodGroup = "O+", Phone = "+1 555 020 2001", Email = "liam.carter@example.com", Address = "14 Maple Street", EmergencyContactName = "Emma Carter", EmergencyContactPhone = "+1 555 020 2002" },
            new Patient { PatientCode = "TMP2", FirstName = "Aisha", LastName = "Khan", DateOfBirth = new DateOnly(1994, 9, 3), Gender = "Female", BloodGroup = "A+", Phone = "+1 555 020 2003", Email = "aisha.khan@example.com", Address = "88 Lake Road" },
            new Patient { PatientCode = "TMP3", FirstName = "Noah", LastName = "Williams", DateOfBirth = new DateOnly(2015, 1, 22), Gender = "Male", BloodGroup = "B+", Phone = "+1 555 020 2004", Address = "5 Cedar Lane", EmergencyContactName = "Olivia Williams", EmergencyContactPhone = "+1 555 020 2005" },
            new Patient { PatientCode = "TMP4", FirstName = "Sara", LastName = "Lindqvist", DateOfBirth = new DateOnly(1976, 11, 30), Gender = "Female", BloodGroup = "AB-", Phone = "+1 555 020 2006", Email = "sara.l@example.com" },
            new Patient { PatientCode = "TMP5", FirstName = "Mateo", LastName = "Silva", DateOfBirth = new DateOnly(1963, 6, 18), Gender = "Male", BloodGroup = "O-", Phone = "+1 555 020 2007", Address = "301 Harbor View" },
        };
        db.Patients.AddRange(patients);
        await db.SaveChangesAsync();
        foreach (var p in patients) p.PatientCode = $"PAT-{p.PatientId:D6}";
        await db.SaveChangesAsync();

        // ---- A few appointments around today, one invoice with a partial payment ----
        var statuses = await db.AppointmentStatuses.ToDictionaryAsync(s => s.StatusName, s => s.AppointmentStatusId);
        var today = DateOnly.FromDateTime(DateTime.Today);
        var demo = new[]
        {
            new Appointment { PatientId = patients[0].PatientId, DoctorId = doctors[0].DoctorId, AppointmentStatusId = statuses[StatusNames.Completed], AppointmentDate = today, StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(9, 20), Reason = "Seasonal fever and cough" },
            new Appointment { PatientId = patients[1].PatientId, DoctorId = doctors[1].DoctorId, AppointmentStatusId = statuses[StatusNames.CheckedIn], AppointmentDate = today, StartTime = new TimeOnly(9, 20), EndTime = new TimeOnly(9, 40), Reason = "Palpitations follow-up" },
            new Appointment { PatientId = patients[2].PatientId, DoctorId = doctors[2].DoctorId, AppointmentStatusId = statuses[StatusNames.Scheduled], AppointmentDate = today, StartTime = new TimeOnly(10, 0), EndTime = new TimeOnly(10, 20), Reason = "Vaccination review" },
            new Appointment { PatientId = patients[3].PatientId, DoctorId = doctors[3].DoctorId, AppointmentStatusId = statuses[StatusNames.Scheduled], AppointmentDate = today.AddDays(1), StartTime = new TimeOnly(9, 40), EndTime = new TimeOnly(10, 0), Reason = "Knee pain" },
            new Appointment { PatientId = patients[4].PatientId, DoctorId = doctors[4].DoctorId, AppointmentStatusId = statuses[StatusNames.Scheduled], AppointmentDate = today.AddDays(2), StartTime = new TimeOnly(11, 0), EndTime = new TimeOnly(11, 20), Reason = "Skin allergy" },
        };
        for (var i = 0; i < demo.Length; i++) demo[i].AppointmentNo = $"TMP-{i}";
        db.Appointments.AddRange(demo);
        await db.SaveChangesAsync();
        foreach (var a in demo) a.AppointmentNo = $"APT-{a.AppointmentId:D6}";

        var invoice = new Invoice
        {
            InvoiceNo = "TMP-INV", PatientId = patients[0].PatientId, AppointmentId = demo[0].AppointmentId,
            InvoiceDate = DateTime.UtcNow, SubTotal = 75, DiscountAmount = 0, TaxAmount = 0, GrandTotal = 75,
            Status = InvoiceStatuses.PartiallyPaid,
            Items =
            {
                new InvoiceItem { ItemDescription = "Consultation - General Medicine", Quantity = 1, UnitPrice = 60, LineTotal = 60 },
                new InvoiceItem { ItemDescription = "Rapid flu test", Quantity = 1, UnitPrice = 15, LineTotal = 15 },
            },
            Payments = { new Payment { Amount = 40, PaymentMethod = "Card", TransactionReference = "CARD-DEMO-0001", PaymentStatus = PaymentStatuses.Completed, PaymentDate = DateTime.UtcNow } }
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        invoice.InvoiceNo = $"INV-{invoice.InvoiceId:D6}";

        db.AuditLogs.Add(new AuditLog { Action = "Seed", EntityName = "Database", Description = "Initial master and demo data created." });
        await db.SaveChangesAsync();
    }
}
