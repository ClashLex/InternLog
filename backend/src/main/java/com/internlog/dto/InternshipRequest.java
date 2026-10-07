package com.internlog.dto;

import jakarta.validation.constraints.*;
import java.util.List;

/** Create/update payload for company opportunities. */
public class InternshipRequest {
  @NotNull public Long companyId;
  @NotBlank public String title;
  public String location;
  public String internshipType = "On-site";
  public Integer stipend = 0;
  public Integer positions = 1;
  public String deadline; // yyyy-MM-dd
  public List<String> skills;
  public String description;
  public String education;
  public String applyUrl;
  /** true = submit for review (Pending Review), false = Draft */
  public Boolean publishRequested = true;
}
