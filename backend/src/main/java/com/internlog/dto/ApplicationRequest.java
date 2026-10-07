package com.internlog.dto;

import jakarta.validation.constraints.*;

/** Manual tracker row (all fields) or board apply (internshipId only). */
public class ApplicationRequest {
  public Long userId;
  public Long internshipId;
  public String company;
  public String role;
  public String location;
  public String internshipType;
  public String appliedDate;
  public String deadline;
  public String interviewDate;
  public Integer stipend;
  public String status;
  public String url;
  public String notes;
}
