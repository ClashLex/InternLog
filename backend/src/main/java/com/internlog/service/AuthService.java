package com.internlog.service;

import com.internlog.dto.AuthDtos.*;
import com.internlog.exception.*;
import com.internlog.model.*;
import com.internlog.repository.*;
import com.internlog.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final UserRepository users;
  private final CompanyRepository companies;
  private final PasswordEncoder passwords;
  private final JwtUtil jwt;

  public AuthService(UserRepository users, CompanyRepository companies,
      PasswordEncoder passwords, JwtUtil jwt) {
    this.users = users;
    this.companies = companies;
    this.passwords = passwords;
    this.jwt = jwt;
  }

  public AuthResponse loginUser(LoginRequest req) {
    // Prototype admin fallback stays for the static frontend gate.
    if (req.email().equalsIgnoreCase("admin@internlog.com") && req.password().equals("admin123")) {
      return new AuthResponse(jwt.issue("admin", 0L, req.email()), "admin", 0L, "InternLog Admin", req.email());
    }
    User user = users.findByEmailIgnoreCase(req.email().trim())
        .orElseThrow(() -> new BadRequestException("Invalid email or password"));
    if (!passwords.matches(req.password(), user.getPasswordHash())) {
      throw new BadRequestException("Invalid email or password");
    }
    if ("Disabled".equalsIgnoreCase(user.getStatus())) {
      throw new BadRequestException("This account has been disabled. Contact support.");
    }
    return new AuthResponse(jwt.issue("user", user.getId(), user.getEmail()),
        "user", user.getId(), user.getName(), user.getEmail());
  }

  public AuthResponse loginCompany(LoginRequest req) {
    Company company = companies.findByEmailIgnoreCase(req.email().trim())
        .orElseThrow(() -> new BadRequestException("Invalid company email or password."));
    if (!passwords.matches(req.password(), company.getPasswordHash())) {
      throw new BadRequestException("Invalid company email or password.");
    }
    if (company.getStatus() == CompanyStatus.Suspended) {
      throw new BadRequestException("This company account is suspended.");
    }
    if (company.getStatus() == CompanyStatus.Rejected) {
      throw new BadRequestException("This company account was rejected by the administrator.");
    }
    if (!company.isApproved()) {
      throw new BadRequestException("Your company account is awaiting admin verification.");
    }
    return new AuthResponse(jwt.issue("company", company.getId(), company.getEmail()),
        "company", company.getId(), company.getName(), company.getEmail());
  }
}
