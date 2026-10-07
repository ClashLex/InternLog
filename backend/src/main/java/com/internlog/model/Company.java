package com.internlog.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

/** Company account. Maps to `internlog_companies` in the prototype. */
@Entity
@Table(name = "companies")
public class Company {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank
  @Column(nullable = false)
  private String name;

  @Email
  @NotBlank
  @Column(nullable = false, unique = true)
  private String email;

  @NotBlank
  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  private String website;
  private String location;
  private String industry;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CompanyStatus status = CompanyStatus.Pending;

  @Column(nullable = false)
  private boolean verified = false;

  @Column(name = "approval_status")
  private String approvalStatus = "Pending";

  @Column(name = "registered_date")
  private LocalDate registeredDate = LocalDate.now();

  public boolean isApproved() {
    return verified && status == CompanyStatus.Active;
  }

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPasswordHash() { return passwordHash; }
  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public String getWebsite() { return website; }
  public void setWebsite(String website) { this.website = website; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public String getIndustry() { return industry; }
  public void setIndustry(String industry) { this.industry = industry; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public CompanyStatus getStatus() { return status; }
  public void setStatus(CompanyStatus status) { this.status = status; }
  public boolean isVerified() { return verified; }
  public void setVerified(boolean verified) { this.verified = verified; }
  public String getApprovalStatus() { return approvalStatus; }
  public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
  public LocalDate getRegisteredDate() { return registeredDate; }
  public void setRegisteredDate(LocalDate registeredDate) { this.registeredDate = registeredDate; }
}
