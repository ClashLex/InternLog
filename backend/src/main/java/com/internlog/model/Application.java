package com.internlog.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Student application. Covers BOTH manual tracker rows and board applies.
 * Maps to `internlog_applications` in the prototype.
 */
@Entity
@Table(name = "applications")
public class Application {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "internship_id")
  private Internship internship;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "company_id")
  private Company company;

  /** Denormalized for fast tables/CSV (kept in sync on save). */
  private String companyName;
  private String role;
  private String location;
  private String type;
  private LocalDate appliedDate;
  private LocalDate deadline;
  private LocalDate interviewDate;
  private Integer stipend = 0;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ApplicationStatus status = ApplicationStatus.Applied;

  private String url;

  @Column(columnDefinition = "TEXT")
  private String notes;

  private Instant updatedAt = Instant.now();

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public User getUser() { return user; }
  public void setUser(User user) { this.user = user; }
  public Internship getInternship() { return internship; }
  public void setInternship(Internship internship) { this.internship = internship; }
  public Company getCompany() { return company; }
  public void setCompany(Company company) { this.company = company; }
  public String getCompanyName() { return companyName; }
  public void setCompanyName(String companyName) { this.companyName = companyName; }
  public String getRole() { return role; }
  public void setRole(String role) { this.role = role; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public LocalDate getAppliedDate() { return appliedDate; }
  public void setAppliedDate(LocalDate appliedDate) { this.appliedDate = appliedDate; }
  public LocalDate getDeadline() { return deadline; }
  public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
  public LocalDate getInterviewDate() { return interviewDate; }
  public void setInterviewDate(LocalDate interviewDate) { this.interviewDate = interviewDate; }
  public Integer getStipend() { return stipend; }
  public void setStipend(Integer stipend) { this.stipend = stipend; }
  public ApplicationStatus getStatus() { return status; }
  public void setStatus(ApplicationStatus status) { this.status = status; }
  public String getUrl() { return url; }
  public void setUrl(String url) { this.url = url; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
