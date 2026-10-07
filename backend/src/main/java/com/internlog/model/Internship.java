package com.internlog.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;

/** Internship opportunity. Maps to `internlog_internships` in the prototype. */
@Entity
@Table(name = "internships")
public class Internship {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  /** Denormalized company name for fast board rendering (kept in sync on save). */
  private String companyName;

  @NotBlank
  private String title;
  private String location;
  private String type;
  private Integer stipend = 0;
  private Integer positions = 1;
  private LocalDate deadline;

  @Column(columnDefinition = "TEXT")
  private String skillsCsv = "";

  @Column(columnDefinition = "TEXT")
  private String description;
  private String education;
  private String applyUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private InternshipStatus status = InternshipStatus.Draft;

  private Instant createdAt = Instant.now();
  private Instant updatedAt;
  private Instant moderatedAt;
  private String moderationNote;

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public Company getCompany() { return company; }
  public void setCompany(Company company) { this.company = company; }
  public String getCompanyName() { return companyName; }
  public void setCompanyName(String companyName) { this.companyName = companyName; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public Integer getStipend() { return stipend; }
  public void setStipend(Integer stipend) { this.stipend = stipend; }
  public Integer getPositions() { return positions; }
  public void setPositions(Integer positions) { this.positions = positions; }
  public LocalDate getDeadline() { return deadline; }
  public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
  public String getSkillsCsv() { return skillsCsv; }
  public void setSkillsCsv(String skillsCsv) { this.skillsCsv = skillsCsv; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getEducation() { return education; }
  public void setEducation(String education) { this.education = education; }
  public String getApplyUrl() { return applyUrl; }
  public void setApplyUrl(String applyUrl) { this.applyUrl = applyUrl; }
  public InternshipStatus getStatus() { return status; }
  public void setStatus(InternshipStatus status) { this.status = status; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  public Instant getModeratedAt() { return moderatedAt; }
  public void setModeratedAt(Instant moderatedAt) { this.moderatedAt = moderatedAt; }
  public String getModerationNote() { return moderationNote; }
  public void setModerationNote(String moderationNote) { this.moderationNote = moderationNote; }
}
