# Hospital Management System

React + ASP.NET Core Web API + SQL Server (EF Core, Code First, Migrations).

Modules: **Patients · Doctors · Appointments · Billing · Admin**
Roles: **Admin, Receptionist, Billing Staff, Doctor**

```
HospitalManagementSystem/
├── backend/HospitalManagement.Api     ASP.NET Core 8 Web API
│   ├── Entities/      EF Core entities (Code First model)
│   ├── Data/          AppDbContext (constraints, indexes, audit stamping) + DbSeeder
│   ├── Dtos/          Request/response contracts with validation attributes
│   ├── Services/      Business rules (booking, billing, auth, audit...)
│   ├── Controllers/   Thin REST controllers with role-based [Authorize]
│   └── Common/        Exception middleware, paging, role constants
└── frontend/          React 18 + Vite + Bootstrap 5
    └── src/ pages/ components/ context/ api/ hooks/ utils/ styles/
```

## 1. Prerequisites
- .NET SDK 8 or newer, SQL Server (LocalDB, Express or full), Node.js 18+
- EF tools: `dotnet tool install --global dotnet-ef`

## 2. Run the API
```bash
cd backend/HospitalManagement.Api
# 1) edit appsettings.json: ConnectionStrings:DefaultConnection and a long random Jwt:Key
# 2) create the first migration (Code First) - this is the schema source of truth
dotnet ef migrations add InitialCreate
# 3) start: pending migrations are applied and demo data is seeded automatically
dotnet run
```
Swagger UI: http://localhost:5080/swagger  
To apply migrations manually instead: `dotnet ef database update`.  
After any entity change: `dotnet ef migrations add <Name>`.

## 3. Run the frontend
```bash
cd frontend
cp .env.example .env      # set VITE_API_URL if the API is not on http://localhost:5080/api
npm install
npm run dev               # http://localhost:5173
```

## 4. Demo accounts (seeded - change before any real use)
| Role | Username | Password |
|---|---|---|
| Admin | admin | Admin@123 |
| Receptionist | reception | Recep@123 |
| Billing Staff | billing | Billing@123 |
| Doctor | dr.sharma | Doctor@123 |

## 5. Key business rules (enforced in `Services/`)
- Appointments can only be booked on a free slot generated from the doctor's active weekly schedule.
- No overlapping active appointments for the same doctor or the same patient (serializable transaction).
- Cancelled, completed and no-show appointments release the slot.
- Status workflow: Scheduled → Checked-In → Waiting → In Consultation → Completed (plus Cancelled / No Show).
- Invoice `GrandTotal = SubTotal − DiscountAmount + TaxAmount`; paid amount and balance are derived from Payments, never stored.
- A payment can never exceed the invoice balance; invoice status becomes Partially Paid / Paid automatically.
- Patients and doctors are deactivated, not deleted; inactive ones cannot take new bookings or invoices.
- Codes are generated: `PAT-000001`, `DOC-0001`, `APT-000001`, `INV-000001` (prefix editable in Settings).
- Doctors with a linked login see only their own appointments.

## 6. Security notes
- Passwords hashed with BCrypt; JWT bearer auth; role checks on every controller action; the UI hides what a role cannot use, but the API is the real gate.
- All data access goes through EF Core (parameterised SQL). Errors never leak internals (see `ExceptionMiddleware`).
- Every important action is written to `AuditLogs`; `CreatedBy/ModifiedBy/CreatedDate/ModifiedDate` are stamped automatically in `AppDbContext.SaveChangesAsync`.
- The token is kept in `localStorage` for simplicity. For production consider httpOnly cookies, HTTPS only, and rotating the `Jwt:Key` via a secret store.

## 7. Background images
Photos load from the Unsplash CDN (`frontend/src/config/images.js`) and sit on top of a teal gradient, so the UI still looks right if an image is blocked. To use your own, put files in `frontend/public/images/` and change the paths in that file.

## 8. Deployment (IIS + SQL Server)
1. `dotnet publish backend/HospitalManagement.Api -c Release -o publish` and install the *ASP.NET Core Hosting Bundle* on the server.
2. Create an IIS site pointing at `publish`, set production `ConnectionStrings` and `Jwt:Key` (environment variables or `appsettings.Production.json`), and add the frontend origin to `Cors:AllowedOrigins`.
3. `cd frontend && VITE_API_URL=https://your-api/api npm run build`, then host `dist/` as a second IIS site (add a URL Rewrite rule sending unknown paths to `index.html`).
4. Run `dotnet ef database update` (or let the first start apply migrations) and change all demo passwords.

## 9. Manual test checklist
Login (valid/invalid) · role access per module · register/edit/deactivate patient · create doctor + schedule · book appointment inside schedule · overlapping booking rejected · reschedule/cancel · invoice with several items · partial then full payment · overpayment rejected · inactive patient/doctor not selectable · audit log entries · layout on phone/tablet/desktop.
