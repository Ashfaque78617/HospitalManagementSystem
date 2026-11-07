using System.Security.Claims;
using System.Text;
using HospitalManagement.Api.Data;
using HospitalManagement.Api.Dtos;
using HospitalManagement.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace HospitalManagement.Api.Services;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) Create(User user);
}

public class TokenService(IConfiguration config) : ITokenService
{
    public (string Token, DateTime ExpiresAt) Create(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(config.GetValue("Jwt:ExpiryMinutes", 480));
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim("sub", user.UserId.ToString()),
                new Claim("name", user.FullName),
                new Claim("role", user.Role.RoleName)
            ]),
            Expires = expires,
            Issuer = config["Jwt:Issuer"],
            Audience = config["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        };
        return (new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }
}

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<UserInfo> GetProfileAsync(int userId);
}

public class AuthService(AppDbContext db, ITokenService tokens, IAuditService audit) : IAuthService
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var username = request.Username.Trim();
        var user = await db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Username == username);

        // One generic message so attackers cannot discover which usernames exist.
        if (user is null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            await audit.LogAsync("LoginFailed", "User", null, $"Failed login for '{username}'.", user?.UserId);
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        var (token, expires) = tokens.Create(user);
        await audit.LogAsync("Login", "User", user.UserId, $"{user.Username} signed in.", user.UserId);
        return new LoginResponse(token, expires, new UserInfo(user.UserId, user.Username, user.FullName, user.Role.RoleName));
    }

    public async Task<UserInfo> GetProfileAsync(int userId)
    {
        var u = await db.Users.AsNoTracking().Include(x => x.Role).FirstOrDefaultAsync(x => x.UserId == userId && x.IsActive)
                ?? throw new UnauthorizedAccessException("Account not found or inactive.");
        return new UserInfo(u.UserId, u.Username, u.FullName, u.Role.RoleName);
    }
}
