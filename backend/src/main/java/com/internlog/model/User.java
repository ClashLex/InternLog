package com.internlog.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

/** Student account. Maps to `internlog_users` in the prototype. */
@Entity
@Table(name = "users")
public class User {

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

  /** BCrypt hash, never plaintext. */
  @NotBlank
  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  private String college;
  private String course;
  private String gradYear;

  @Column(name = "registered_date")
  private LocalDate registeredDate = LocalDate.now();

  @Column(nullable = false)
  private String status = "Active";

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPasswordHash() { return passwordHash; }
  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public String getCollege() { return college; }
  public void setCollege(String college) { this.college = college; }
  public String getCourse() { return course; }
  public void setCourse(String course) { this.course = course; }
  public String getGradYear() { return gradYear; }
  public void setGradYear(String gradYear) { this.gradYear = gradYear; }
  public LocalDate getRegisteredDate() { return registeredDate; }
  public void setRegisteredDate(LocalDate registeredDate) { this.registeredDate = registeredDate; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
}
