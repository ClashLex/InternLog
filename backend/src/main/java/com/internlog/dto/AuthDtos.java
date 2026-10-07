package com.internlog.dto;

import jakarta.validation.constraints.*;
import java.util.List;

/** Shared auth + response shapes. Frontend field names kept identical where possible. */
public class AuthDtos {

  public record RegisterUserRequest(
      @NotBlank String name,
      @Email @NotBlank String email,
      @NotBlank @Size(min = 8) String password,
      String college, String course, String gradYear) {}

  public record RegisterCompanyRequest(
      @NotBlank String name,
      @Email @NotBlank String email,
      @NotBlank @Size(min = 8) String password,
      String website, String location, String industry, String description) {}

  public record LoginRequest(
      @Email @NotBlank String email,
      @NotBlank String password) {}

  public record AuthResponse(
      String token, String role, Long userId, String name, String email) {}

  public record UserResponse(
      Long id, String name, String email, String college, String course,
      String gradYear, String registeredDate, String status) {}

  public record CompanyResponse(
      Long id, String name, String email, String website, String location,
      String industry, String description, String status, boolean verified,
      String approvalStatus, long internshipCount) {}

  public record InternshipResponse(
      Long id, Long companyId, String company, String title, String location,
      String internshipType, Integer stipend, Integer positions, String deadline,
      List<String> skills, String description, String education, String applyUrl,
      String status, String createdAt, String updatedAt, String moderationNote) {}

  public record ApplicationResponse(
      Long id, Long userId, Long internshipId, Long companyId,
      String company, String role, String location, String internshipType,
      String appliedDate, String deadline, String interviewDate, Integer stipend,
      String status, String url, String notes, String studentName, String studentEmail) {}

  public record SavedSearchResponse(
      Long id, Long userId, String query, String location, String type,
      Integer minStipend, String createdAt) {}

  public record StatusPatch(@NotBlank String status) {}
  public record Message(String message) {}
}
