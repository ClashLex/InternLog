package com.internlog.model;

/** Internship moderation states. Mirrors the prototype workflow. */
public enum InternshipStatus {
  Draft,
  Pending_Review,
  Published,
  Rejected,
  Expired,
  Archived,
  Suspended;

  /** Accepts both "Pending Review" (frontend) and "Pending_Review" (DB). */
  public static InternshipStatus fromString(String value) {
    if (value == null) return Draft;
    String normalized = value.trim().replace(" ", "_");
    for (InternshipStatus status : values()) {
      if (status.name().equalsIgnoreCase(normalized)) return status;
    }
    throw new IllegalArgumentException("Unknown internship status: " + value);
  }

  public String toFrontend() {
    return name().replace("_", " ");
  }
}
